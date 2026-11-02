import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Prisma } from '@prisma/client';
import { SettingsService } from '../settings/settings.service';

function derivePaidFrom(method: string): string {
  const mapa: Record<string, string> = { CASH: 'PHARMACY_CASH', MPESA: 'MPESA', EMOLA: 'EMOLA', CARD: 'BANK', TRANSFER: 'BANK', OTHER: 'OTHER' };
  return mapa[method] ?? 'OTHER';
}

const PAID_FROM_METHODS: Record<string, string[]> = { PHARMACY_CASH: ['CASH'], OWNER_CASH: ['CASH'], BANK: ['CARD', 'TRANSFER'], MPESA: ['MPESA'], EMOLA: ['EMOLA'], OTHER: ['OTHER'] };

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService, private settings: SettingsService) {}

  private async assertPaidFromAllowed(pharmacyId: string, paidFrom: string, origin: string, method: string, tx: Prisma.TransactionClient) {
    if (!(PAID_FROM_METHODS[paidFrom] ?? []).includes(method)) throw new BadRequestException('Método de pagamento incompatível com a origem do dinheiro.');
    const s = await this.settings.get(pharmacyId, tx);
    if (origin === 'COLLABORATOR' && !s.collaboratorExpenses) throw new BadRequestException('A farmácia não permite despesas registadas pelo colaborador.');
    if (paidFrom === 'PHARMACY_CASH' && !s.allowCashExpenses) throw new BadRequestException('A farmácia não permite pagar despesas pela caixa.');
  }

  async create(pharmacyId: string, userId: string, dto: CreateExpenseDto, outerTx?: Prisma.TransactionClient) {
    const run = async (tx: Prisma.TransactionClient) => {
      const paidFrom = dto.paidFrom ?? derivePaidFrom(dto.method);
      await this.assertPaidFromAllowed(pharmacyId, paidFrom, dto.origin ?? 'ADMIN', dto.method, tx);
      const expense = await tx.expense.create({
        data: {
          pharmacyId,
          userId,
          description: dto.description,
          category: dto.category,
          amount: dto.amount,
          method: dto.method,
          expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
          externalReference: dto.externalReference,
          notes: dto.notes,
          origin: dto.origin ?? 'ADMIN',
          paidFrom: paidFrom as any,
          status: 'DRAFT',
        },
      });

      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'expense.create', entity: 'Expense', entityId: expense.id },
      });

      return expense;
    };
    return outerTx ? run(outerTx) : this.prisma.$transaction(run);
  }

  async findAll(
    pharmacyId: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
    category?: string,
    method?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.ExpenseWhereInput = {
      pharmacyId,
      ...(category && { category: category as any }),
      ...(method && { method: method as any }),
      ...(status && { status: status as any }),
      ...(search && {
        OR: [
          { description: { contains: search, mode: 'insensitive' } },
          { externalReference: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...((startDate || endDate) && {
        expenseDate: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        include: { user: { select: { fullName: true } } },
        orderBy: { expenseDate: 'desc' },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(pharmacyId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, pharmacyId },
      include: { user: { select: { fullName: true } }, cashMovement: true },
    });
    if (!expense) throw new NotFoundException('Despesa não encontrada.');
    return expense;
  }

  async update(pharmacyId: string, userId: string, id: string, dto: UpdateExpenseDto) {
    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findFirst({ where: { id, pharmacyId } });
      if (!expense) throw new NotFoundException('Despesa não encontrada.');
      if (expense.status !== 'DRAFT') throw new BadRequestException('Apenas despesas em rascunho podem ser editadas.');
      const mergedMethod = dto.method ?? expense.method;
      const mergedPaid = dto.paidFrom ?? (dto.method !== undefined ? derivePaidFrom(dto.method) : expense.paidFrom);
      await this.assertPaidFromAllowed(pharmacyId, mergedPaid, expense.origin, mergedMethod, tx);

      const updated = await tx.expense.update({
        where: { id },
        data: {
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.category !== undefined && { category: dto.category }),
          ...(dto.amount !== undefined && { amount: dto.amount }),
          ...(dto.method !== undefined && { method: dto.method }),
          ...((dto.paidFrom !== undefined || dto.method !== undefined) && { paidFrom: mergedPaid as any }),
          ...(dto.expenseDate !== undefined && { expenseDate: new Date(dto.expenseDate) }),
          ...(dto.externalReference !== undefined && { externalReference: dto.externalReference }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
        },
      });

      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'expense.update', entity: 'Expense', entityId: id },
      });

      return updated;
    });
  }

  async cancel(pharmacyId: string, userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findFirst({ where: { id, pharmacyId } });
      if (!expense) throw new NotFoundException('Despesa não encontrada.');
      if (expense.status !== 'DRAFT') throw new BadRequestException('Apenas despesas em rascunho podem ser canceladas.');

      const updated = await tx.expense.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'expense.cancel', entity: 'Expense', entityId: id },
      });

      return updated;
    });
  }

  async confirm(pharmacyId: string, userId: string, id: string, outerTx?: Prisma.TransactionClient, permissions: string[] = []) {
    const run = async (tx: Prisma.TransactionClient) => {
        const expenses = await tx.$queryRaw`
          SELECT * FROM "expenses" 
          WHERE id = ${id}::uuid AND "pharmacyId" = ${pharmacyId}::uuid 
          FOR UPDATE
        ` as Array<{ id: string; status: string; amount: number; method: string; description: string; cashSessionId: string | null; paidFrom: string; userId: string }>;
        const expense = expenses[0];
        if (!expense) throw new NotFoundException('Despesa não encontrada.');

        // Idempotência: se já está CONFIRMED, devolver o estado actual sem efeitos.
        if (expense.status === 'CONFIRMED') {
          const existing = await tx.expense.findUnique({ where: { id } });
          return existing;
        }

        if (expense.status !== 'DRAFT') throw new BadRequestException('Apenas despesas em rascunho podem ser confirmadas.');
        if (expense.paidFrom === 'PHARMACY_CASH' && !permissions.includes('pharmacy:config:write')) {
          const ap = await this.settings.get(pharmacyId, tx);
          if (ap.requireApprovalForCash) throw new BadRequestException('Aguarda aprovação do administrador.');
        }
        if (expense.paidFrom === 'PHARMACY_CASH') {
          const st = await this.settings.get(pharmacyId, tx);
          if (!st.allowCashExpenses) throw new BadRequestException('A farmácia não permite pagar despesas pela caixa.');
        }
        if (expense.amount <= 0) throw new BadRequestException('Valor da despesa deve ser positivo.');

        let cashSessionId: string | null = null;

        if (expense.paidFrom === 'PHARMACY_CASH') {
          const sessions = await tx.$queryRaw`
            SELECT * FROM "cash_sessions" 
            WHERE "pharmacyId" = ${pharmacyId}::uuid 
              AND "userId" = ${expense.userId}::uuid 
              AND status = 'OPEN'
            FOR UPDATE
          ` as Array<{ id: string }>;
          const session = sessions[0];
          if (!session) throw new BadRequestException('Não tem sessão de caixa aberta para despesas em dinheiro.');
          cashSessionId = session.id;

          // Defesa em profundidade: verificar se já existe cashMovement para esta despesa.
          const existingMovement = await tx.cashMovement.findUnique({ where: { expenseId: expense.id } });
          if (!existingMovement) {
            await tx.cashMovement.create({
              data: {
                cashSessionId: session.id,
                type: 'OUT',
                amount: expense.amount,
                reason: `Despesa: ${expense.description}`,
                expenseId: expense.id,
                userId,
              },
            });
          }
        }

        const updated = await tx.expense.update({
          where: { id },
          data: {
            status: 'CONFIRMED',
            confirmedBy: userId,
            confirmedAt: new Date(),
            cashSessionId,
          },
        });

        await tx.auditLog.create({
          data: { pharmacyId, userId, action: 'expense.confirm', entity: 'Expense', entityId: id },
        });

        return updated;
    };
    try {
      return outerTx ? await run(outerTx) : await this.prisma.$transaction(run);
    } catch (error) {
      // Se a transacção falhou por violação de unicidade em cashMovement.expenseId,
      // é sinal de que outra transacção concorrente já criou o movimento.
      // Nesse caso, ler o estado actual (fora da transacção) e devolver idempotente.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const current = await this.prisma.expense.findFirst({
          where: { id, pharmacyId },
          include: { user: { select: { fullName: true } }, cashMovement: true },
        });
        if (current && current.status === 'CONFIRMED' && current.cashMovement) {
          return current;
        }
        throw new ConflictException('Não foi possível confirmar a despesa devido a um conflito concorrente. Tente novamente.');
      }
      throw error;
    }
  }
}


