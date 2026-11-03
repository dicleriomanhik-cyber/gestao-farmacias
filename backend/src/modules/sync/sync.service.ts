// @ts-nocheck
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { SyncExtraService } from './sync-extra.service';

const PAYMENT_METHODS = ['CASH', 'CARD', 'MPESA', 'EMOLA', 'TRANSFER', 'OTHER'];

const rank = (type: string) => ({ CASH_OPEN: 0, SALE: 1, PAYMENT: 2 }[type] ?? 3);

const reject = (code: string, reason: string) => ({
  status: 'REJECTED',
  rejectionCode: code,
  rejectionReason: reason,
});

function toResult(op: any) {
  return {
    idempotencyKey: op.idempotencyKey,
    status: op.status,
    result: op.result,
    rejectionCode: op.rejectionCode,
    rejectionReason: op.rejectionReason,
    createdAt: op.createdAt,
    processedAt: op.processedAt,
  };
}

@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService, private extra: SyncExtraService) {}

  async push(pharmacyId: string, userId: string, clientId: string, operations: any[], perms: string[] = []) {
    // Vendas primeiro: os pagamentos do mesmo lote dependem delas
    const ordered = [...operations].sort((a, b) => rank(a.operationType) - rank(b.operationType));
    const results = [];
    for (const op of ordered) {
      results.push(await this.processOne(pharmacyId, userId, clientId, op, perms));
    }
    return { results };
  }

  async findOperation(pharmacyId: string, idempotencyKey: string) {
    const op = await this.prisma.syncOperation.findFirst({ where: { idempotencyKey, pharmacyId } });
    if (!op) throw new NotFoundException('Operação não encontrada.');
    return toResult(op);
  }

  async pull(pharmacyId: string, cursor?: string, limit = 100) {
    const desde = cursor ? new Date(cursor) : new Date(0);
    const cond = { gte: desde };
    const take = Math.min(limit, 200);
    const [sales, movements, sessions, cashMovs, expenses, returns, products, lots] = await Promise.all([
      this.prisma.sale.findMany({ where: { pharmacyId, updatedAt: cond }, include: { lines: { include: { lots: true } }, payments: true }, orderBy: { updatedAt: 'asc' }, take }),
      this.prisma.stockMovement.findMany({ where: { pharmacyId, createdAt: cond }, orderBy: { createdAt: 'asc' }, take }),
      this.prisma.cashSession.findMany({ where: { pharmacyId, updatedAt: cond }, orderBy: { updatedAt: 'asc' }, take }),
      this.prisma.cashMovement.findMany({ where: { cashSession: { pharmacyId }, createdAt: cond }, orderBy: { createdAt: 'asc' }, take }),
      this.prisma.expense.findMany({ where: { pharmacyId, updatedAt: cond }, orderBy: { updatedAt: 'asc' }, take }),
      this.prisma.saleReturn.findMany({ where: { pharmacyId, updatedAt: cond }, orderBy: { updatedAt: 'asc' }, take }),
      this.prisma.product.findMany({ where: { pharmacyId, status: 'ACTIVE' } }),
      this.prisma.stockLot.findMany({ where: { pharmacyId, status: 'ACTIVE', quantityAvailable: { gt: 0 } } }),
    ]);
    const changes = [
      ...sales.map((data) => ({ type: 'SALE', data })),
      ...movements.map((data) => ({ type: 'STOCK_MOVEMENT', data })),
      ...sessions.map((data) => ({ type: 'CASH_SESSION', data })),
      ...cashMovs.map((data) => ({ type: 'CASH_MOVEMENT', data })),
      ...expenses.map((data) => ({ type: 'EXPENSE', data })),
      ...returns.map((data) => ({ type: 'RETURN', data })),
      ...products.map((data) => ({ type: 'PRODUCT', action: 'SNAPSHOT', data })),
      ...lots.map((data) => ({ type: 'STOCK_LOT', action: 'SNAPSHOT', data })),
    ];
    const datas = changes.map((c: any) => new Date(c.data.updatedAt ?? c.data.createdAt ?? c.data.openedAt).getTime());
    const nextCursor = datas.length ? new Date(Math.max(...datas)).toISOString() : (cursor ?? new Date().toISOString());
    const hasMore = sales.length === take || movements.length === take || sessions.length === take || cashMovs.length === take || expenses.length === take || returns.length === take;
    return { changes, nextCursor, hasMore };
  }

  private async processOne(pharmacyId: string, userId: string, clientId: string, op: any, perms: string[] = []) {
    const existing = await this.prisma.syncOperation.findUnique({ where: { idempotencyKey: op.idempotencyKey } });
    // Já processada: devolve o resultado guardado, sem criar nada de novo
    if (existing && existing.status !== 'PENDING') return toResult(existing);

    if (op.operationType === 'SALE') return this.processSale(pharmacyId, userId, clientId, op);
    if (op.operationType === 'PAYMENT') return this.processPayment(pharmacyId, userId, clientId, op);
    if (op.operationType === 'CASH_OPEN') return this.processCashOpen(pharmacyId, userId, clientId, op);
    if (this.extra.supports(op.operationType)) return this.finish(this.prisma, pharmacyId, clientId, op, await this.extra.handle(pharmacyId, userId, perms, op, existing));

    return this.finish(this.prisma, pharmacyId, clientId, op, reject('UNKNOWN_TYPE', 'Tipo de operação desconhecido.'));
  }

  private async processCashOpen(pharmacyId: string, userId: string, clientId: string, op: any) {
    const openingBalance = Number(op.payload?.openingBalance ?? 0);
    if (!(openingBalance >= 0)) {
      return this.finish(this.prisma, pharmacyId, clientId, op, reject('INVALID_AMOUNT', 'Saldo inicial inválido.'));
    }
    const existing = await this.prisma.cashSession.findFirst({ where: { pharmacyId, userId, status: 'OPEN' } });
    if (existing) {
      return this.finish(this.prisma, pharmacyId, clientId, op, { status: 'PROCESSED', result: { cashSessionId: existing.id }, rejectionCode: null, rejectionReason: null });
    }
    const session = await this.prisma.cashSession.create({ data: { pharmacyId, userId, openingBalance: new Decimal(openingBalance), status: 'OPEN' } });
    return this.finish(this.prisma, pharmacyId, clientId, op, { status: 'PROCESSED', result: { cashSessionId: session.id }, rejectionCode: null, rejectionReason: null });
  }

  private async finish(client: any, pharmacyId: string, clientId: string, op: any, data: any) {
    const saved = await client.syncOperation.upsert({
      where: { idempotencyKey: op.idempotencyKey },
      create: {
        pharmacyId,
        clientId,
        idempotencyKey: op.idempotencyKey,
        operationType: op.operationType,
        payload: op.payload ?? {},
        processedAt: new Date(),
        ...data,
      },
      update: { processedAt: new Date(), ...data },
    });
    return toResult(saved);
  }

  private async processSale(pharmacyId: string, userId: string, clientId: string, op: any) {
    const lines: any[] = Array.isArray(op.payload?.lines) ? op.payload.lines : [];
    if (lines.length === 0) {
      return this.finish(this.prisma, pharmacyId, clientId, op, reject('EMPTY_SALE', 'Venda sem linhas.'));
    }
    if (lines.some((l) => !(Number(l.quantity) > 0))) {
      return this.finish(this.prisma, pharmacyId, clientId, op, reject('INVALID_QUANTITY', 'Quantidade inválida numa linha.'));
    }

    const productIds = [...new Set(lines.map((l) => l.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, pharmacyId, status: 'ACTIVE' },
    });
    if (products.length !== productIds.length) {
      return this.finish(this.prisma, pharmacyId, clientId, op, reject('INVALID_PRODUCT', 'Um ou mais produtos são inválidos ou inativos.'));
    }

    // Preço sempre do servidor, como na criação normal de vendas
    let subtotal = new Decimal(0);
    const linesData = lines.map((line) => {
      const product = products.find((p) => p.id === line.productId);
      const quantity = Number(line.quantity);
      const unitPrice = product.salePrice;
      const lineSubtotal = unitPrice.mul(quantity);
      subtotal = subtotal.add(lineSubtotal);
      return { productId: line.productId, quantity, unitPrice, discount: new Decimal(0), subtotal: lineSubtotal };
    });

    return this.prisma.$transaction(async (tx) => {
      const count = await tx.sale.count({ where: { pharmacyId } });
      const saleNumber = `VND-${String(count + 1).padStart(6, '0')}`;

      const sale = await tx.sale.create({
        data: {
          pharmacyId,
          userId,
          saleNumber,
          status: 'DRAFT',
          subtotal,
          discount: new Decimal(0),
          total: subtotal,
          notes: 'Sincronizada do modo offline',
          lines: { create: linesData },
        },
        include: { lines: true },
      });

      // FEFO: mesma regra do confirm normal, mas sem falhar se faltar stock
      const shortages: { productId: string; missing: number }[] = [];
      for (const line of sale.lines) {
        let remaining = line.quantity;
        const lots = await tx.$queryRaw`
          SELECT id, "quantityAvailable" FROM "stock_lots"
          WHERE "productId" = ${line.productId}::uuid
            AND "pharmacyId" = ${pharmacyId}::uuid
            AND "quantityAvailable" > 0
            AND "expiryDate" > NOW()
            AND status = 'ACTIVE'
          ORDER BY "expiryDate" ASC
          FOR UPDATE
        `;
        for (const lot of lots) {
          if (remaining <= 0) break;
          const consume = Math.min(remaining, Number(lot.quantityAvailable));
          await tx.stockLot.update({ where: { id: lot.id }, data: { quantityAvailable: { decrement: consume } } });
          await tx.stockMovement.create({
            data: {
              pharmacyId,
              productId: line.productId,
              lotId: lot.id,
              type: 'SALE',
              quantity: -consume,
              referenceId: sale.id,
              referenceType: 'Sale',
              userId,
            },
          });
          await tx.saleLineLot.create({ data: { saleLineId: line.id, lotId: lot.id, quantity: consume } });
          remaining -= consume;
        }
        if (remaining > 0) shortages.push({ productId: line.productId, missing: remaining });
      }

      await tx.sale.update({ where: { id: sale.id }, data: { status: 'CONFIRMED' } });
      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'sale.sync', entity: 'Sale', entityId: sale.id },
      });

      const conflict = shortages.length > 0;
      return this.finish(tx, pharmacyId, clientId, op, {
        status: conflict ? 'CONFLICT' : 'PROCESSED',
        saleId: sale.id,
        result: { saleId: sale.id, saleNumber, shortages },
        rejectionCode: conflict ? 'STOCK_SHORTAGE' : null,
        rejectionReason: conflict
          ? 'Stock insuficiente no momento da sincronização. Venda registada com stock a zero; rever o stock.'
          : null,
      });
    });
  }

  private async processPayment(pharmacyId: string, userId: string, clientId: string, op: any) {
    const { saleKey, amount, method } = op.payload ?? {};

    if (!PAYMENT_METHODS.includes(method)) {
      return this.finish(this.prisma, pharmacyId, clientId, op, reject('INVALID_METHOD', 'Método de pagamento inválido.'));
    }
    if (!(Number(amount) > 0)) {
      return this.finish(this.prisma, pharmacyId, clientId, op, reject('INVALID_AMOUNT', 'Valor de pagamento inválido.'));
    }

    // A venda original tem de estar sincronizada primeiro
    const saleOp = saleKey
      ? await this.prisma.syncOperation.findUnique({ where: { idempotencyKey: saleKey } })
      : null;
    if (!saleOp || !saleOp.saleId) {
      return this.finish(this.prisma, pharmacyId, clientId, op, {
        status: 'PENDING',
        rejectionCode: 'SALE_NOT_SYNCED',
        rejectionReason: 'Venda ainda não sincronizada.',
      });
    }
    if (saleOp.status === 'REJECTED') {
      return this.finish(this.prisma, pharmacyId, clientId, op, reject('SALE_REJECTED', 'A venda original foi rejeitada.'));
    }

    // Sem caixa aberta o pagamento fica pendente e tenta de novo no próximo ciclo
    const session = await this.prisma.cashSession.findFirst({ where: { pharmacyId, userId, status: 'OPEN' } });
    if (!session) {
      return this.finish(this.prisma, pharmacyId, clientId, op, {
        status: 'PENDING',
        rejectionCode: 'NO_OPEN_SESSION',
        rejectionReason: 'Abra o caixa para sincronizar os pagamentos.',
      });
    }

    const value = new Decimal(Number(amount));

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "cash_sessions" WHERE id = ${session.id}::uuid FOR UPDATE`;

      const sale = await tx.sale.findFirst({
        where: { id: saleOp.saleId, pharmacyId },
        include: { payments: true },
      });
      if (!sale) return this.finish(tx, pharmacyId, clientId, op, reject('SALE_NOT_FOUND', 'Venda não encontrada.'));
      if (sale.status !== 'CONFIRMED') {
        return this.finish(tx, pharmacyId, clientId, op, reject('SALE_NOT_CONFIRMED', 'A venda não está confirmada.'));
      }

      const paid = sale.payments.reduce((acc, p) => acc.add(p.amount), new Decimal(0));
      const pending = sale.total.sub(paid);
      if (value.gt(pending)) {
        return this.finish(tx, pharmacyId, clientId, op, reject('OVERPAYMENT', `Valor excede o saldo pendente (${pending.toFixed(2)}).`));
      }

      const payment = await tx.salePayment.create({
        data: {
          saleId: sale.id,
          cashSessionId: session.id,
          method,
          amount: value,
          userId,
          idempotencyKey: op.idempotencyKey,
        },
      });
      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'payment.sync', entity: 'SalePayment', entityId: payment.id },
      });

      return this.finish(tx, pharmacyId, clientId, op, {
        status: 'PROCESSED',
        saleId: sale.id,
        result: { paymentId: payment.id, saleId: sale.id },
      });
    });
  }
}



