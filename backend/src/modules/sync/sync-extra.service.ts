// @ts-nocheck
import { ConflictException, HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ExpensesService } from '../expenses/expenses.service';
import { ReturnsService } from '../returns/returns.service';
import { CashService } from '../cash/cash.service';
import { CategoriesService } from '../categories/categories.service';
import { ProductsService } from '../products/products.service';
import { StockService } from '../stock/stock.service';

const NEEDS: Record<string, string[]> = {
  EXPENSE: ['expenses:create'],
  EXPENSE_CONFIRM: ['expenses:confirm'],
  EXPENSE_CANCEL: ['expenses:cancel'],
  EXPENSE_UPDATE: ['expenses:create'],
  RETURN: ['returns:create'],
  RETURN_CONFIRM: ['returns:confirm'],
  RETURN_INSPECT: ['returns:inspect'],
  RETURN_CANCEL: [],
  REFUND: ['returns:refund'],
  CASH_CLOSE: ['cash:close'],
  CATEGORY_CREATE: ['products:write'],
  CATEGORY_UPDATE: ['products:write'],
  PRODUCT_CREATE: ['products:write'],
  STOCK_BOX_CREATE: ['stock:write'],
};

const isLocal = (v: any) => typeof v === 'string' && v.startsWith('LOCAL-');
const ok = (result: any) => ({ status: 'PROCESSED', result, rejectionCode: null, rejectionReason: null });
const wait = (code: string, reason: string, result?: any) => ({ status: 'PENDING', result, rejectionCode: code, rejectionReason: reason });
const rej = (code: string, reason: string, result?: any) => ({ status: 'REJECTED', result, rejectionCode: code, rejectionReason: reason });

function msgOf(e: any): string {
  const r = e.getResponse();
  const m = typeof r === 'string' ? r : r?.message;
  return Array.isArray(m) ? m.join(' ') : String(m ?? e.message);
}

@Injectable()
export class SyncExtraService {
  constructor(
    private prisma: PrismaService,
    private expenses: ExpensesService,
    private returns: ReturnsService,
    private cash: CashService,
    private categories: CategoriesService,
    private products: ProductsService,
    private stock: StockService,
  ) {}

  supports(type: string) {
    return Object.prototype.hasOwnProperty.call(NEEDS, type);
  }

  async handle(pharmacyId: string, userId: string, perms: string[], op: any, existing: any) {
    const p = op.payload ?? {};
    const need = [...NEEDS[op.operationType], ...(op.operationType === 'EXPENSE' && p.confirm ? ['expenses:confirm'] : [])];
    if (!need.every((x) => perms.includes(x))) return rej('FORBIDDEN', 'Sem permissão para esta operação.');
    try {
      return await this.run(pharmacyId, userId, perms, op, p, existing);
    } catch (e: any) {
      if (e instanceof HttpException) return rej('SERVER_REJECTED', msgOf(e));
      throw e;
    }
  }

  private async ref(p: any, field: string) {
    if (p[field] && !isLocal(p[field])) return p[field];
    if (p.createKey) {
      const o = await this.prisma.syncOperation.findUnique({ where: { idempotencyKey: p.createKey } });
      return (o?.result as any)?.[field] ?? null;
    }
    return null;
  }

  private async sessionRef(p: any) {
    const key = p.openKey ?? p.cashOpenKey;
    if (key) {
      const o = await this.prisma.syncOperation.findUnique({ where: { idempotencyKey: key } });
      return (o?.result as any)?.cashSessionId ?? null;
    }
    const id = p.cashSessionId ?? p.sessionId;
    return id && !isLocal(id) ? id : null;
  }

  private async confirmExp(pharmacyId: string, userId: string, perms: string[], expenseId: string) {
    try {
      await this.expenses.confirm(pharmacyId, userId, expenseId, perms);
      return ok({ expenseId });
    } catch (e: any) {
      if (!(e instanceof HttpException)) throw e;
      const m = msgOf(e);
      if (m.includes('Aguarda aprovação')) return ok({ expenseId, awaitingApproval: true });
      if (m.includes('sessão de caixa')) return wait('NO_OPEN_SESSION', 'Abra o caixa para sincronizar a despesa.', { expenseId });
      return rej('SERVER_REJECTED', m, { expenseId });
    }
  }

  private async run(pharmacyId: string, userId: string, perms: string[], op: any, p: any, existing: any) {
    switch (op.operationType) {
      case 'EXPENSE': {
        let expenseId = (existing?.result as any)?.expenseId ?? null;
        if (!expenseId) {
          const e = await this.expenses.create(pharmacyId, userId, {
            description: p.description,
            category: p.category,
            amount: Number(p.amount),
            method: p.method,
            paidFrom: p.paidFrom,
            origin: p.origin,
            expenseDate: p.expenseDate,
          });
          expenseId = e.id;
        }
        if (!p.confirm) return ok({ expenseId });
        return this.confirmExp(pharmacyId, userId, perms, expenseId);
      }
      case 'EXPENSE_CONFIRM': {
        const id = await this.ref(p, 'expenseId');
        if (!id) return wait('REF_NOT_SYNCED', 'Despesa ainda não sincronizada.');
        return this.confirmExp(pharmacyId, userId, perms, id);
      }
      case 'EXPENSE_CANCEL': {
        const id = await this.ref(p, 'expenseId');
        if (!id) return wait('REF_NOT_SYNCED', 'Despesa ainda não sincronizada.');
        await this.expenses.cancel(pharmacyId, userId, id);
        return ok({ expenseId: id });
      }
      case 'EXPENSE_UPDATE': {
        const id = await this.ref(p, 'expenseId');
        if (!id) return wait('REF_NOT_SYNCED', 'Despesa ainda não sincronizada.');
        await this.expenses.update(pharmacyId, userId, id, p.data ?? {});
        return ok({ expenseId: id });
      }
      case 'CASH_CLOSE': {
        const sessionId = await this.sessionRef(p);
        if (!sessionId) return wait('REF_NOT_SYNCED', 'Caixa ainda não sincronizada.');
        await this.cash.closeCash(pharmacyId, userId, sessionId, { countedBalance: Number(p.countedBalance) });
        return ok({ cashSessionId: sessionId });
      }
      case 'RETURN': {
        const ret = await this.returns.create(pharmacyId, userId, {
          saleId: p.saleId,
          reason: p.reason,
          lines: (p.lines ?? []).map((l: any) => ({ saleLineId: l.saleLineId, quantity: Number(l.quantity), lotNumber: l.lotNumber ?? undefined, expiryDate: l.expiryDate ?? undefined })),
        });
        return ok({ returnId: ret.id });
      }
      case 'RETURN_CONFIRM': {
        const id = await this.ref(p, 'returnId');
        if (!id) return wait('REF_NOT_SYNCED', 'Devolução ainda não sincronizada.');
        await this.returns.confirm(pharmacyId, userId, id);
        return ok({ returnId: id });
      }
      case 'RETURN_INSPECT': {
        const id = await this.ref(p, 'returnId');
        if (!id) return wait('REF_NOT_SYNCED', 'Devolução ainda não sincronizada.');
        const line = await this.prisma.saleReturnLine.findFirst({ where: { returnId: id, saleLineId: p.saleLineId } });
        if (!line) return rej('LINE_NOT_FOUND', 'Linha da devolução não encontrada.');
        await this.returns.inspectAndRelease(pharmacyId, userId, id, line.id, { condition: p.condition, quantityToRelease: Number(p.quantityToRelease) });
        return ok({ returnId: id });
      }
      case 'REFUND': {
        const id = await this.ref(p, 'returnId');
        if (!id) return wait('REF_NOT_SYNCED', 'Devolução ainda não sincronizada.');
        const line = await this.prisma.saleReturnLine.findFirst({ where: { returnId: id, saleLineId: p.saleLineId } });
        if (!line) return rej('LINE_NOT_FOUND', 'Linha da devolução não encontrada.');
        let cashSessionId: string | undefined;
        if (p.method === 'CASH') {
          cashSessionId = (await this.sessionRef(p)) ?? (await this.prisma.cashSession.findFirst({ where: { pharmacyId, userId, status: 'OPEN' } }))?.id;
          if (!cashSessionId) return wait('NO_OPEN_SESSION', 'Abra o caixa para sincronizar o reembolso.');
        }
        const refund = await this.returns.refund(pharmacyId, userId, id, {
          method: p.method,
          amount: Number(p.amount),
          cashSessionId,
          salePaymentId: p.salePaymentId,
          returnLineId: line.id,
          idempotencyKey: op.idempotencyKey,
        });
        return ok({ refundId: refund.id });
      }
      case 'RETURN_CANCEL':
        return rej('UNSUPPORTED_OPERATION', 'O cancelamento de devolução confirmada ainda não existe no servidor.');
      case 'CATEGORY_CREATE': {
        let cat: any;
        try {
          cat = await this.categories.create(pharmacyId, { name: p.name, description: p.description ?? undefined });
        } catch (e: any) {
          if (!(e instanceof ConflictException)) throw e;
          cat = await this.prisma.category.findFirst({ where: { pharmacyId, name: p.name } });
        }
        return ok({ categoryId: cat.id });
      }
      case 'CATEGORY_UPDATE': {
        const id = await this.ref(p, 'categoryId');
        if (!id) return wait('REF_NOT_SYNCED', 'Categoria ainda não sincronizada.');
        await this.categories.update(pharmacyId, id, p.data ?? {});
        return ok({ categoryId: id });
      }
      case 'PRODUCT_CREATE': {
        const d: any = {};
        for (const k of ['name', 'description', 'sku', 'barcode', 'activeIngredient', 'dosageForm', 'strength', 'unit', 'type', 'hasExpiry', 'referenceCost', 'status', 'categoryId']) {
          if (p[k] !== undefined && p[k] !== null) d[k] = p[k];
        }
        d.salePrice = Number(p.salePrice ?? 0);
        const prod = await this.products.create(pharmacyId, userId, d);
        return ok({ productId: prod.id });
      }
      case 'STOCK_BOX_CREATE': {
        const productId = await this.ref(p, 'productId');
        if (!productId) return wait('REF_NOT_SYNCED', 'Produto ainda não sincronizado.');
        const lot = await this.stock.createBox(pharmacyId, userId, {
          productId,
          qrCode: p.qrCode,
          expiryDate: p.expiryDate ?? undefined,
          innerCount: p.innerCount,
          unitsPerInner: p.unitsPerInner,
          totalUnits: p.totalUnits,
          unitCost: p.unitCost,
          purchaseId: p.purchaseId,
          acquisitionCost: p.acquisitionCost,
        });
        return ok({ lotId: lot.id });
      }
    }
    return rej('UNKNOWN_TYPE', 'Tipo de operação desconhecido.');
  }
}