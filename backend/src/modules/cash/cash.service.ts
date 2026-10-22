import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OpenCashDto } from './dto/open-cash.dto';
import { CloseCashDto } from './dto/close-cash.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';

@Injectable()
export class CashService {
  constructor(private prisma: PrismaService) {}

  async openCash(pharmacyId: string, userId: string, dto: OpenCashDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.cashSession.findFirst({
        where: { pharmacyId, userId, status: 'OPEN' },
      });
      if (existing) throw new ConflictException('Já existe uma sessão de caixa aberta.');

      const session = await tx.cashSession.create({
        data: { pharmacyId, userId, openingBalance: dto.openingBalance, status: 'OPEN' },
      });

      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'cash.open', entity: 'CashSession', entityId: session.id },
      });
      return session;
    });
  }

  async closeCash(pharmacyId: string, userId: string, sessionId: string, dto: CloseCashDto) {
    return this.prisma.$transaction(async (tx) => {
      const sessions = await tx.$queryRaw`
        SELECT * FROM "cash_sessions" 
        WHERE id = ${sessionId}::uuid AND "pharmacyId" = ${pharmacyId}::uuid AND "userId" = ${userId}::uuid 
        FOR UPDATE
      ` as Array<{ id: string; openingBalance: Decimal; status: string }>;
      const session = sessions[0];
      if (!session) throw new NotFoundException('Sessão de caixa não encontrada.');
      if (session.status !== 'OPEN') throw new BadRequestException('Sessão já fechada.');

      const cashPayments = await tx.salePayment.aggregate({
        where: { cashSessionId: sessionId, method: 'CASH' },
        _sum: { amount: true },
      });
      const movementsIn = await tx.cashMovement.aggregate({
        where: { cashSessionId: sessionId, type: 'IN' },
        _sum: { amount: true },
      });
      const movementsOut = await tx.cashMovement.aggregate({
        where: { cashSessionId: sessionId, type: 'OUT' },
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
          expectedBalance: expected,
          countedBalance: dto.countedBalance,
          difference,
        },
      });
      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'cash.close', entity: 'CashSession', entityId: sessionId },
      });
      return closed;
    });
  }

  async getActiveSession(pharmacyId: string, userId: string) {
    return this.prisma.cashSession.findFirst({
      where: { pharmacyId, userId, status: 'OPEN' },
    });
  }

  async createPayment(pharmacyId: string, userId: string, dto: CreatePaymentDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const sessions = await tx.$queryRaw`
          SELECT * FROM "cash_sessions" 
          WHERE "pharmacyId" = ${pharmacyId}::uuid AND "userId" = ${userId}::uuid AND status = 'OPEN'
          FOR UPDATE
        ` as Array<{ id: string }>;
        const session = sessions[0];
        if (!session) throw new BadRequestException('Não tem sessão de caixa aberta.');

        if (dto.idempotencyKey) {
          const existing = await tx.salePayment.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
          if (existing) return existing;
        }

        const sale = await tx.sale.findFirst({
          where: { id: dto.saleId, pharmacyId },
          include: { payments: true },
        });
        if (!sale) throw new NotFoundException('Venda não encontrada.');
        if (sale.status !== 'CONFIRMED') throw new BadRequestException('Apenas vendas confirmadas podem ser pagas.');

        const totalPaid = sale.payments.reduce((acc, p) => acc.add(p.amount), new Decimal(0));
        const pending = sale.total.sub(totalPaid);
        if (new Decimal(dto.amount).gt(pending)) {
          throw new BadRequestException(`Valor excede o saldo pendente (${pending.toFixed(2)}).`);
        }

        await tx.$queryRaw`SELECT id FROM "sales" WHERE id = ${sale.id}::uuid FOR UPDATE`;

        const payment = await tx.salePayment.create({
          data: {
            saleId: sale.id,
            cashSessionId: session.id,
            method: dto.method,
            amount: dto.amount,
            userId,
            idempotencyKey: dto.idempotencyKey,
          },
        });

        await tx.auditLog.create({
          data: { pharmacyId, userId, action: 'payment.create', entity: 'SalePayment', entityId: payment.id },
        });

        return payment;
      });
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
        WHERE "pharmacyId" = ${pharmacyId}::uuid AND "userId" = ${userId}::uuid AND status = 'OPEN'
        FOR UPDATE
      ` as Array<{ id: string }>;
      const session = sessions[0];
      if (!session) throw new BadRequestException('Não tem sessão de caixa aberta.');

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