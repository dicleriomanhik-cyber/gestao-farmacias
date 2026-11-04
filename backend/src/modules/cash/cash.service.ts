import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OpenCashDto } from './dto/open-cash.dto';
import { CloseCashDto } from './dto/close-cash.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { emitOutboxEvent } from '../sync/outbox.helper';

@Injectable()
export class CashService {
  constructor(private prisma: PrismaService) {}

  private async operatorFields(tx: Prisma.TransactionClient, pharmacyId: string, operatorId: string | undefined, required: boolean, kind: 'opened' | 'closed') {
    if (!operatorId) {
      if (!required) return {};
      const n = await tx.pharmacyOperator.count({ where: { pharmacyId, isActive: true } });
      if (n > 0) throw new BadRequestException('Escolhe o colaborador.');
      return {};
    }
    const op = await tx.pharmacyOperator.findFirst({ where: { id: operatorId, pharmacyId, ...(required ? { isActive: true } : {}) }, select: { id: true, name: true } });
    if (!op) throw new BadRequestException('Colaborador inv\u00e1lido.');
    return kind === 'opened' ? { openedByOperatorId: op.id, openedByOperatorName: op.name } : { closedByOperatorId: op.id, closedByOperatorName: op.name };
  }

  async openCash(pharmacyId: string, userId: string, dto: OpenCashDto, outerTx?: Prisma.TransactionClient, returnExisting = false) {
    const run = async (tx: Prisma.TransactionClient) => {
      const existing = await tx.cashSession.findFirst({
        where: { pharmacyId, userId, status: 'OPEN' }, orderBy: { openedAt: 'desc' },
      });
      if (existing && returnExisting) return existing;
      if (existing) throw new ConflictException('J� existe uma sess�o de caixa aberta.');

      const session = await tx.cashSession.create({
        data: { pharmacyId, userId, openingBalance: dto.openingBalance, status: 'OPEN', ...(await this.operatorFields(tx, pharmacyId, dto.operatorId, !outerTx, 'opened')) },
      });

      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'cash.open', entity: 'CashSession', entityId: session.id },
      });
      return session;
    };
    return outerTx ? run(outerTx) : this.prisma.$transaction(run);
  }

  async closeCash(pharmacyId: string, userId: string, sessionId: string, dto: CloseCashDto, outerTx?: Prisma.TransactionClient) {
    const run = async (tx: Prisma.TransactionClient) => {
      const sessions = await tx.$queryRaw`
        SELECT * FROM "cash_sessions" 
        WHERE id = ${sessionId}::uuid AND "pharmacyId" = ${pharmacyId}::uuid AND "userId" = ${userId}::uuid 
        FOR UPDATE
      ` as Array<{ id: string; openingBalance: Decimal; status: string }>;
      const session = sessions[0];
      if (!session) throw new NotFoundException('Sess�o de caixa n�o encontrada.');
      if (session.status !== 'OPEN') throw new BadRequestException('Sess�o j� fechada.');

      const opener: string | null = (session as any).openedByOperatorId ?? null;
      if (opener && dto.operatorId && dto.operatorId !== opener) throw new BadRequestException('S\u00f3 quem abriu a caixa pode fech\u00e1-la.');
      const closeOperator = dto.operatorId ?? opener ?? undefined;
      const cashPayments = await tx.salePayment.aggregate({
        where: { cashSessionId: sessionId, method: 'CASH' },
        _sum: { amount: true },
      });
      const movementsIn = await tx.cashMovement.aggregate({
        where: { cashSessionId: sessionId, type: 'IN' },
        _sum: { amount: true },
      });
      const movementsOut = await tx.cashMovement.aggregate({
        where: { cashSessionId: sessionId, type: 'OUT', method: 'CASH' },
        _sum: { amount: true },
      });

      const expected = new Decimal(session.openingBalance)
        .add(cashPayments._sum.amount || 0)
        .add(movementsIn._sum.amount || 0)
        .sub(movementsOut._sum.amount || 0);

      const difference = new Decimal(dto.countedBalance).sub(expected);

      const closed = await tx.cashSession.update({
        where: { id: sessionId },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          ...(await this.operatorFields(tx, pharmacyId, closeOperator, !outerTx && !opener, 'closed')),
          expectedBalance: expected,
          countedBalance: dto.countedBalance,
          difference,
        },
      });
      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'cash.close', entity: 'CashSession', entityId: sessionId },
      });
      return closed;
    };
    return outerTx ? run(outerTx) : this.prisma.$transaction(run);
  }

  async getActiveSession(pharmacyId: string, userId: string) {
    return this.prisma.cashSession.findFirst({
      where: { pharmacyId, userId, status: 'OPEN' }, orderBy: { openedAt: 'desc' },
    });
  }

  async getPayments(pharmacyId: string, userId: string) {
    const session = await this.prisma.cashSession.findFirst({
      where: { pharmacyId, userId, status: 'OPEN' }, orderBy: { openedAt: 'desc' },
    });
    if (!session) throw new NotFoundException('N�o tem sess�o de caixa aberta.');

    const payments = await this.prisma.salePayment.findMany({
      where: { cashSessionId: session.id },
      orderBy: { createdAt: 'desc' },
    });

    const totalsByMethod = {
      CASH: 0,
      CARD: 0,
      MPESA: 0,
      EMOLA: 0,
      TRANSFER: 0,
      OTHER: 0,
    };

    payments.forEach((p) => {
      if (totalsByMethod[p.method] !== undefined) {
        totalsByMethod[p.method] += parseFloat(p.amount.toString());
      }
    });

    return { session, payments, totalsByMethod };
  }

  async getMovements(pharmacyId: string, userId: string) {
    const session = await this.prisma.cashSession.findFirst({
      where: { pharmacyId, userId, status: 'OPEN' }, orderBy: { openedAt: 'desc' },
    });
    if (!session) throw new NotFoundException('N�o tem sess�o de caixa aberta.');

    return this.prisma.cashMovement.findMany({
      where: { cashSessionId: session.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPayment(pharmacyId: string, userId: string, dto: CreatePaymentDto, tx?: Prisma.TransactionClient) {
    const run = async (txc: Prisma.TransactionClient) => {
      const sessions = await txc.$queryRaw`
        SELECT * FROM "cash_sessions" 
        WHERE "pharmacyId" = ${pharmacyId}::uuid AND "userId" = ${userId}::uuid AND status = 'OPEN' ORDER BY "openedAt" DESC LIMIT 1
        FOR UPDATE
      ` as Array<{ id: string }>;
      const session = sessions[0];
      if (!session) throw new BadRequestException('Nao tem sessao de caixa aberta.');

      const existing = await txc.salePayment.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
      if (existing) return existing;

      const sale = await txc.sale.findFirst({
        where: { id: dto.saleId, pharmacyId },
        include: { payments: true },
      });
      if (!sale) throw new NotFoundException('Venda nao encontrada.');
      if (sale.status !== 'CONFIRMED') throw new BadRequestException('Apenas vendas confirmadas podem ser pagas.');

      const totalPaid = sale.payments.reduce((acc, p) => acc.add(p.amount), new Decimal(0));
      const pending = sale.total.sub(totalPaid);
      if (new Decimal(dto.amount).gt(pending)) {
        throw new BadRequestException(`Valor excede o saldo pendente (${pending.toFixed(2)}).`);
      }

      await txc.$queryRaw`SELECT id FROM "sales" WHERE id = ${sale.id}::uuid FOR UPDATE`;

      const payment = await txc.salePayment.create({
        data: {
          saleId: sale.id,
          cashSessionId: session.id,
          method: dto.method,
          amount: dto.amount,
          userId,
          idempotencyKey: dto.idempotencyKey,
        },
      });

      await txc.auditLog.create({
        data: { pharmacyId, userId, action: 'payment.create', entity: 'SalePayment', entityId: payment.id },
      });
      await emitOutboxEvent(txc, pharmacyId, 'SALE_PAYMENT', payment.id, 'CREATED', payment as any);

      return payment;
    };

    if (tx) {
      return run(tx);
    }

    try {
      return await this.prisma.$transaction((txc) => run(txc));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.salePayment.findUnique({
          where: { idempotencyKey: dto.idempotencyKey },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }
  async createMovement(pharmacyId: string, userId: string, dto: CreateCashMovementDto) {
    return this.prisma.$transaction(async (tx) => {
      const sessions = await tx.$queryRaw`
        SELECT * FROM "cash_sessions" 
        WHERE "pharmacyId" = ${pharmacyId}::uuid AND "userId" = ${userId}::uuid AND status = 'OPEN' ORDER BY "openedAt" DESC LIMIT 1
        FOR UPDATE
      ` as Array<{ id: string }>;
      const session = sessions[0];
      if (!session) throw new BadRequestException('N�o tem sess�o de caixa aberta.');

      const movement = await tx.cashMovement.create({
        data: { cashSessionId: session.id, type: dto.type, amount: dto.amount, reason: dto.reason, userId },
      });

      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'cash.movement', entity: 'CashMovement', entityId: movement.id },
      });

      return movement;
    });
  }
}



