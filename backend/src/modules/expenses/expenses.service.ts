// @ts-nocheck
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(pharmacyId: string, userId: string, dto: CreateExpenseDto) {
    return this.prisma.$transaction(async (tx) => {
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
          status: 'DRAFT',
        },
      });

      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'expense.create', entity: 'Expense', entityId: expense.id },
      });

      return expense;
    });
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

      const updated = await tx.expense.update({
        where: { id },
        data: {
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.category !== undefined && { category: dto.category }),
          ...(dto.amount !== undefined && { amount: dto.amount }),
          ...(dto.method !== undefined && { method: dto.method }),
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

  async confirm(pharmacyId: string, userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      // Lock da despesa para evitar dupla confirmação
      const expenses = await tx.$queryRaw`
        SELECT * FROM "expenses" 
        WHERE id = ${id}::uuid AND "pharmacyId" = ${pharmacyId}::uuid 
        FOR UPDATE
      `;
      const expense = expenses[0];
      if (!expense) throw new NotFoundException('Despesa não encontrada.');
      if (expense.status !== 'DRAFT') throw new BadRequestException('Apenas despesas em rascunho podem ser confirmadas.');
      if (Number(expense.amount) <= 0) throw new BadRequestException('Valor da despesa deve ser positivo.');

      let cashSessionId: string | null = null;

      if (expense.method === 'CASH') {
        // Lock da sessão de caixa aberta do utilizador/farmácia
        const sessions = await tx.$queryRaw`
          SELECT * FROM "cash_sessions" 
          WHERE "pharmacyId" = ${pharmacyId}::uuid 
            AND "userId" = ${userId}::uuid 
            AND status = 'OPEN'
          FOR UPDATE
        `;
        const session = sessions[0];
        if (!session) throw new BadRequestException('Não tem sessão de caixa aberta para despesas em dinheiro.');
        cashSessionId = session.id;

        // Criar CashMovement OUT
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
    });
  }
}