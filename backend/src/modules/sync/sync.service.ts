import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { withSyncOperationLock } from './operation-lock.helper';
import { emitOutboxEvent } from './outbox.helper';
import { recomputePurchaseTotal } from '../purchases/purchase-math';
import { lockReceiptLine } from '../purchases/receipt-line';
import { recomputeLotCosts } from '../purchases/purchase-costs';
import { PrismaService } from '../../database/prisma.service';
import { SalesService } from '../sales/sales.service';
import { CashService } from '../cash/cash.service';
import { ExpensesService } from '../expenses/expenses.service';
import { ReturnsService } from '../returns/returns.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { PurchasesService } from '../purchases/purchases.service';
import { SupplierPaymentsService } from '../purchases/supplier-payments.service';
import { SyncPushDto } from './dto/sync-push.dto';
import { SyncSalePayloadDto } from './dto/sync-sale-payload.dto';
import { SyncPullDto } from './dto/sync-pull.dto';
import { SyncPaymentPayloadDto } from './dto/sync-payment.dto';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

const MAX_PAYLOAD_BYTES = 64 * 1024;
const PENDING_ABANDON_MS = 5 * 60 * 1000;
const ADMIN_OPS = ['EXPENSE', 'RETURN', 'CASH_CLOSE', 'EXPENSE_CONFIRM', 'EXPENSE_CANCEL', 'EXPENSE_UPDATE', 'RETURN_CONFIRM', 'RETURN_INSPECT', 'RETURN_CANCEL', 'REFUND', 'CATEGORY_CREATE', 'CATEGORY_UPDATE', 'PRODUCT_CREATE', 'STOCK_BOX_CREATE', 'PURCHASE_LINE_DAMAGED', 'PURCHASE_LINE_CLOSE', 'SUPPLIER_CREATE', 'SUPPLIER_UPDATE', 'PURCHASE_CREATE', 'PURCHASE_UPDATE', 'PURCHASE_LINES_REPLACE', 'PURCHASE_CONFIRM', 'PURCHASE_CANCEL', 'SUPPLIER_PAYMENT_CREATE'];

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = canonicalize((value as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return value;
}

function hashPayload(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonicalize(payload))).digest('hex');
}

async function loadReceiptLine(tx: Prisma.TransactionClient, pharmacyId: string, lineId: string) {
  return lockReceiptLine(tx, pharmacyId, lineId);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_FIELDS = ['saleId', 'saleLineId', 'salePaymentId', 'returnId', 'expenseId', 'cashSessionId', 'sessionId', 'categoryId', 'productId', 'purchaseId', 'purchaseLineId', 'lineId', 'supplierId', 'newId', 'newLineId'];

function findInvalidId(payload: any): string | null {
  if (!payload || typeof payload !== 'object') return null;
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const r = findInvalidId(item);
      if (r) return r;
    }
    return null;
  }
  for (const [k, v] of Object.entries(payload)) {
    if (UUID_FIELDS.includes(k) && v !== undefined && v !== null && v !== '' && (typeof v !== 'string' || !UUID_RE.test(v))) return k;
    if (v && typeof v === 'object') {
      const r = findInvalidId(v);
      if (r) return r;
    }
  }
  return null;
}

// Erros temporarios de infraestrutura (ligacao, timeout, deadlock): voltam a ser tentados. Os restantes rejeitam so a operacao.
function isTransientInfra(e: any): boolean {
  const code = e?.code;
  return ['P1001', 'P1002', 'P1008', 'P1017', 'P2024', 'P2034'].includes(code);
}

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salesService: SalesService,
    private readonly cashService: CashService,
    private readonly config: ConfigService,
    private readonly expensesService: ExpensesService,
    private readonly returnsService: ReturnsService,
    private readonly suppliersService: SuppliersService,
    private readonly purchasesService: PurchasesService,
    private readonly supplierPaymentsService: SupplierPaymentsService,
  ) {}

  private async resolveReturnId(tx: Prisma.TransactionClient, pharmacyId: string, payload: any): Promise<string> {
    if (payload?.returnId) return payload.returnId;
    if (!payload?.createKey) throw new BadRequestException('Chave da devolucao em falta.');
    const createOp = await tx.syncOperation.findFirst({ where: { pharmacyId, idempotencyKey: payload.createKey, operationType: 'RETURN', status: 'PROCESSED' } });
    const returnId = (createOp?.result as any)?.returnId;
    if (!returnId) throw new BadRequestException('Devolucao ainda nao sincronizada.');
    return returnId;
  }

  private async resolveCashSessionId(tx: Prisma.TransactionClient, pharmacyId: string, payload: any): Promise<string | undefined> {
    let sessionId: string | undefined = payload?.cashSessionId;
    if (!sessionId && payload?.cashOpenKey) {
      const openOp = await tx.syncOperation.findFirst({ where: { pharmacyId, idempotencyKey: payload.cashOpenKey, operationType: 'CASH_OPEN', status: 'PROCESSED' } });
      sessionId = (openOp?.result as any)?.cashSessionId;
    }
    if (!sessionId) return undefined;
    const stillOpen = await tx.cashSession.findFirst({ where: { id: sessionId, pharmacyId, status: 'OPEN' }, select: { id: true } });
    if (stillOpen) return sessionId;
    const current = await tx.cashSession.findFirst({ where: { pharmacyId, status: 'OPEN' }, orderBy: { openedAt: 'desc' }, select: { id: true } });
    return current?.id ?? sessionId;
  }

  private async resolveExpenseId(tx: Prisma.TransactionClient, pharmacyId: string, payload: any): Promise<string> {
    if (payload?.expenseId) return payload.expenseId;
    if (!payload?.createKey) throw new BadRequestException('Chave da despesa em falta.');
    const createOp = await tx.syncOperation.findFirst({ where: { pharmacyId, idempotencyKey: payload.createKey, operationType: 'EXPENSE', status: 'PROCESSED' } });
    const expenseId = (createOp?.result as any)?.expenseId;
    if (!expenseId) throw new BadRequestException('Despesa ainda nao sincronizada.');
    return expenseId;
  }

  private async runAdminOperation(op: any, pharmacyId: string, userId: string, tx: Prisma.TransactionClient) {
    if (op.operationType === 'PRODUCT_CREATE') {
      const d = op.payload ?? {};
      const name = String(d.name ?? '').trim();
      if (name.length < 2) throw new BadRequestException('Nome do produto invalido.');
      const type = d.type === 'MEDICINE' ? 'MEDICINE' : 'PRODUCT';
      if (type === 'MEDICINE') {
        if (!d.strength || !d.activeIngredient) throw new BadRequestException('MEDICINE requer dosagem e principio activo.');
        if (d.hasExpiry === false) throw new BadRequestException('MEDICINE tem sempre validade.');
      }
      const salePrice = Number(d.salePrice);
      if (!Number.isFinite(salePrice) || salePrice < 0) throw new BadRequestException('Preco de venda invalido.');
      if (d.categoryId) {
        const cat = await tx.category.findFirst({ where: { id: d.categoryId, pharmacyId } });
        if (!cat) throw new BadRequestException('Categoria invalida.');
      }
      const or: any[] = [];
      if (d.sku) or.push({ sku: d.sku });
      if (d.barcode) or.push({ barcode: d.barcode });
      if (or.length) {
        const dup = await tx.product.findFirst({ where: { pharmacyId, OR: or } });
        if (dup) throw new BadRequestException('SKU ou Codigo de Barras ja existe nesta farmacia.');
      }
      const data: any = { pharmacyId, name, type, salePrice, hasExpiry: type === 'MEDICINE' ? true : d.hasExpiry !== false, status: 'ACTIVE' };
      for (const k of ['description', 'activeIngredient', 'dosageForm', 'strength', 'sku', 'barcode', 'categoryId']) {
        if (typeof d[k] === 'string' && d[k] !== '') data[k] = d[k];
      }
      if (typeof d.minStock === 'number') data.minStock = d.minStock;
      const product = await tx.product.create({ data });
      await tx.auditLog.create({ data: { pharmacyId, userId, action: 'product.create', entity: 'Product', entityId: product.id } });
      await emitOutboxEvent(tx, pharmacyId, 'PRODUCT', product.id, 'CREATED', product as any);
      return { productId: product.id };
    }
    if (op.operationType === 'STOCK_BOX_CREATE') {
      const d = op.payload ?? {};
      const rline = d.purchaseLineId ? await loadReceiptLine(tx, pharmacyId, String(d.purchaseLineId)) : null;
      if (rline && rline.received + rline.quantityDamaged >= rline.quantity) throw new BadRequestException(`Linha ja recebida por completo (${rline.received} de ${rline.quantity} caixas).`);
      let productId: string | undefined = rline ? rline.productId : d.productId;
      if (!productId) {
        if (!d.createKey) throw new BadRequestException('Chave do produto em falta.');
        const createOp = await tx.syncOperation.findFirst({ where: { pharmacyId, idempotencyKey: d.createKey, operationType: 'PRODUCT_CREATE', status: 'PROCESSED' } });
        productId = (createOp?.result as any)?.productId;
        if (!productId) throw new BadRequestException('Produto ainda nao sincronizado.');
      }
      const product = await tx.product.findFirst({ where: { id: productId, pharmacyId }, select: { id: true, type: true, hasExpiry: true } });
      if (!product) throw new NotFoundException('Produto nao encontrado.');
      const qrCode = String(d.qrCode ?? '').trim();
      if (!qrCode) throw new BadRequestException('QR Code obrigatorio.');
      const expiryDate = d.expiryDate ? new Date(d.expiryDate) : null;
      if (expiryDate && isNaN(expiryDate.getTime())) throw new BadRequestException('Data de validade invalida.');
      if (expiryDate && !product.hasExpiry) throw new BadRequestException('Produto sem validade nao aceita data de validade.');
      if (!expiryDate && product.hasExpiry && !d.noExpiry) throw new BadRequestException('Validade obrigatoria para este produto.');
      if (expiryDate && expiryDate.getTime() <= Date.now()) throw new BadRequestException('Validade já expirada: não é possível registar produto fora do prazo.');
      let innerCount: number | null = null;
      let unitsPerInner: number | null = null;
      let totalUnits: number;
      if (product.type === 'MEDICINE') {
        innerCount = Number(d.innerCount ?? rline?.innerCount);
        unitsPerInner = Number(d.unitsPerInner ?? rline?.unitsPerInner);
        if (!(innerCount > 0) || !(unitsPerInner > 0)) throw new BadRequestException('MEDICINE requer caixinhas e carteiras por caixinha.');
        totalUnits = innerCount * unitsPerInner;
      } else {
        totalUnits = Number(d.totalUnits ?? rline?.unitsPerBox);
        if (!(totalUnits > 0)) throw new BadRequestException('Total de unidades invalido.');
      }
      const acqRaw = rline ? Math.round((Number(rline.subtotal) / rline.quantity + Number.EPSILON) * 100) / 100 : d.acquisitionCost;
      const acquisitionCost: number | null = acqRaw === undefined || acqRaw === null ? null : Number(acqRaw);
      if (acquisitionCost !== null && (!Number.isFinite(acquisitionCost) || acquisitionCost < 0)) throw new BadRequestException('Custo de aquisição inválido.');
      let purchaseId: string | null = rline ? rline.purchaseId : null;
      if (!rline && d.purchaseId) {
        const pur = await tx.purchase.findFirst({ where: { id: d.purchaseId, pharmacyId }, select: { status: true } });
        if (!pur || pur.status !== 'DRAFT') throw new BadRequestException('Compra inválida ou já confirmada.');
        if (acquisitionCost === null) throw new BadRequestException('Indica o custo de aquisição da caixa.');
        purchaseId = d.purchaseId;
      }
      const dupLot = await tx.stockLot.findFirst({ where: { pharmacyId, OR: [{ qrCode }, { productId: product.id, lotNumber: qrCode }] }, select: { id: true } });
      if (dupLot) throw new BadRequestException('QR Code ou lote duplicado nesta farmacia.');
      const lot = await tx.stockLot.create({
        data: {
          pharmacyId,
          productId: product.id,
          lotNumber: qrCode,
          purchaseLineId: rline ? rline.id : null,
          qrCode,
          expiryDate,
          quantityReceived: totalUnits,
          quantityReceivedFromLine: 0,
          quantityAvailable: totalUnits,
          innerCount,
          unitsPerInner,
          totalUnits,
          unitCost: rline ? Math.round((Number(acquisitionCost) / totalUnits + Number.EPSILON) * 100) / 100 : Number(d.unitCost ?? 0) || 0,
          purchaseId,
          acquisitionCost,
          status: 'ACTIVE',
        },
      });
      await tx.stockMovement.create({
        data: { pharmacyId, productId: product.id, lotId: lot.id, type: rline ? 'PURCHASE_ENTRY' : 'DIRECT_ENTRY', quantity: totalUnits, referenceId: rline ? rline.purchaseId : lot.id, referenceType: rline ? 'Purchase' : 'StockLot', userId, notes: rline ? 'Receção de fatura (caixa)' : 'Entrada directa de caixa (createBox)' },
      });
      await tx.auditLog.create({ data: { pharmacyId, userId, action: rline ? 'stock.box.receive' : 'stock.box.create', entity: 'StockLot', entityId: lot.id } });
      if (purchaseId) {
        if (!rline) await recomputePurchaseTotal(tx, purchaseId);
        await recomputeLotCosts(tx, purchaseId);
      } else {
        const rc = acquisitionCost !== null ? acquisitionCost / totalUnits : Number(d.unitCost) > 0 ? Number(d.unitCost) : null;
        if (rc !== null) await tx.stockLot.update({ where: { id: lot.id }, data: { realUnitCost: Math.round((rc + Number.EPSILON) * 1e6) / 1e6 } });
      }
      if (rline && d.salePrice !== undefined && d.salePrice !== null && d.salePrice !== '') {
        const sp = Number(d.salePrice);
        if (!Number.isFinite(sp) || sp < 0) throw new BadRequestException('Preco de venda invalido.');
        const upProd = await tx.product.update({ where: { id: product.id }, data: { salePrice: sp } });
        await emitOutboxEvent(tx, pharmacyId, 'PRODUCT', upProd.id, 'UPDATED', upProd as any);
      }
      if (rline) { const ativ = await tx.product.updateMany({ where: { id: product.id, pharmacyId, status: 'INACTIVE' }, data: { status: 'ACTIVE' } }); if (ativ.count > 0) { const reat = await tx.product.findUnique({ where: { id: product.id } }); await emitOutboxEvent(tx, pharmacyId, 'PRODUCT', product.id, 'UPDATED', reat as any); } }
      await emitOutboxEvent(tx, pharmacyId, 'STOCK_LOT', lot.id, 'CREATED', lot as any);
      return { lotId: lot.id };
    }
    if (op.operationType === 'PURCHASE_LINE_DAMAGED') {
      const d = op.payload ?? {};
      const qty = Number(d.quantity);
      if (!Number.isInteger(qty) || qty < 1) throw new BadRequestException('Quantidade invalida.');
      const line = await loadReceiptLine(tx, pharmacyId, String(d.lineId ?? ''));
      if (line.received + line.quantityDamaged + qty > line.quantity) throw new BadRequestException(`So faltam ${line.quantity - line.received - line.quantityDamaged} caixas nesta linha.`);
      const note = typeof d.note === 'string' && d.note.trim() ? d.note.trim().slice(0, 500) : undefined;
      await tx.purchaseLine.update({ where: { id: line.id }, data: { quantityDamaged: { increment: qty }, ...(note ? { damageNote: note } : {}) } });
      await tx.purchase.update({ where: { id: line.purchaseId }, data: { updatedAt: new Date() } });
      await tx.auditLog.create({ data: { pharmacyId, userId, action: 'purchase.line.damaged', entity: 'PurchaseLine', entityId: line.id } });
      return { lineId: line.id };
    }
    if (op.operationType === 'PURCHASE_LINE_CLOSE') {
      const line = await loadReceiptLine(tx, pharmacyId, String(op.payload?.lineId ?? ''));
      await tx.purchaseLine.update({ where: { id: line.id }, data: { closed: true } });
      await tx.purchase.update({ where: { id: line.purchaseId }, data: { updatedAt: new Date() } });
      await tx.auditLog.create({ data: { pharmacyId, userId, action: 'purchase.line.closed', entity: 'PurchaseLine', entityId: line.id } });
      return { lineId: line.id };
    }
    if (op.operationType === 'SUPPLIER_CREATE') {
      const d = op.payload ?? {};
      const s: any = await this.suppliersService.create(pharmacyId, userId, (d.data ?? {}) as any, tx, d.newId);
      return { supplierId: s.id };
    }
    if (op.operationType === 'SUPPLIER_UPDATE') {
      const d = op.payload ?? {};
      const s: any = await this.suppliersService.update(pharmacyId, userId, String(d.supplierId ?? ''), (d.data ?? {}) as any, tx);
      return { supplierId: s.id };
    }
    if (op.operationType === 'PURCHASE_CREATE') {
      const d = op.payload ?? {};
      const p: any = await this.purchasesService.create(pharmacyId, userId, d.data as any, tx, d.newId);
      return { purchaseId: p.id };
    }
    if (op.operationType === 'PURCHASE_UPDATE') {
      const d = op.payload ?? {};
      await this.purchasesService.update(pharmacyId, userId, String(d.purchaseId ?? ''), (d.data ?? {}) as any, tx);
      return { purchaseId: d.purchaseId };
    }
    if (op.operationType === 'PURCHASE_LINES_REPLACE') {
      const d = op.payload ?? {};
      await this.purchasesService.replaceLines(pharmacyId, userId, String(d.purchaseId ?? ''), (d.lines ?? []) as any, tx);
      return { purchaseId: d.purchaseId };
    }
    if (op.operationType === 'PURCHASE_CONFIRM') {
      const d = op.payload ?? {};
      await this.purchasesService.confirm(pharmacyId, userId, String(d.purchaseId ?? ''), d.pay && d.pay.paidFrom && d.pay.method ? { paidFrom: d.pay.paidFrom, method: d.pay.method } : undefined, tx);
      return { purchaseId: d.purchaseId };
    }
    if (op.operationType === 'PURCHASE_CANCEL') {
      const d = op.payload ?? {};
      await this.purchasesService.cancel(pharmacyId, userId, String(d.purchaseId ?? ''), tx);
      return { purchaseId: d.purchaseId };
    }
    if (op.operationType === 'SUPPLIER_PAYMENT_CREATE') {
      const d = op.payload ?? {};
      const pay: any = await this.supplierPaymentsService.pay(pharmacyId, userId, { purchaseId: String(d.purchaseId ?? ''), amount: Number(d.amount), paidFrom: String(d.paidFrom ?? ''), method: String(d.method ?? ''), notes: d.notes || undefined }, tx);
      return { paymentId: pay.id };
    }
    if (op.operationType === 'CATEGORY_CREATE') {
      const name = String(op.payload?.name ?? '').trim();
      if (name.length < 2 || name.length > 50) throw new BadRequestException('Nome da categoria invalido.');
      const exists = await tx.category.findFirst({ where: { pharmacyId, name } });
      if (exists) return { categoryId: exists.id };
      const cat = await tx.category.create({ data: { name, description: op.payload?.description || undefined, pharmacyId } });
      return { categoryId: cat.id };
    }
    if (op.operationType === 'CATEGORY_UPDATE') {
      let categoryId: string | undefined = op.payload?.categoryId;
      if (!categoryId) {
        if (!op.payload?.createKey) throw new BadRequestException('Chave da categoria em falta.');
        const createOp = await tx.syncOperation.findFirst({ where: { pharmacyId, idempotencyKey: op.payload.createKey, operationType: 'CATEGORY_CREATE', status: 'PROCESSED' } });
        categoryId = (createOp?.result as any)?.categoryId;
        if (!categoryId) throw new BadRequestException('Categoria ainda nao sincronizada.');
      }
      const cat = await tx.category.findFirst({ where: { id: categoryId, pharmacyId } });
      if (!cat) throw new NotFoundException('Categoria nao encontrada.');
      const d = op.payload?.data ?? {};
      const data: any = {};
      if (typeof d.name === 'string' && d.name.trim().length >= 2) data.name = d.name.trim();
      if (typeof d.description === 'string') data.description = d.description;
      if (typeof d.isActive === 'boolean') data.isActive = d.isActive;
      const upd = await tx.category.update({ where: { id: categoryId }, data });
      return { categoryId: upd.id };
    }
    if (op.operationType === 'EXPENSE') {
      const { confirm, ...expenseData } = op.payload ?? {};
      const expense = await this.expensesService.create(pharmacyId, userId, expenseData, tx);
      if (confirm) {
        try {
          await this.expensesService.confirm(pharmacyId, userId, expense.id, tx);
        } catch (e: any) {
          if (e instanceof BadRequestException && String(e.message).includes('Aguarda aprovação')) return { expenseId: expense.id, awaitingApproval: true };
          throw e;
        }
      }
      return { expenseId: expense.id };
    }
    if (op.operationType === 'RETURN') {
      const ret = await this.returnsService.create(pharmacyId, userId, op.payload, tx);
      return { returnId: ret.id, lines: ret.lines.map((l: any) => ({ id: l.id, saleLineId: l.saleLineId })) };
    }
    if (op.operationType === 'RETURN_CONFIRM') {
      const returnId = await this.resolveReturnId(tx, pharmacyId, op.payload);
      const confirmed = await this.returnsService.confirm(pharmacyId, userId, returnId, tx);
      return { returnId: confirmed.id };
    }
    if (op.operationType === 'RETURN_CANCEL') {
      const returnId = await this.resolveReturnId(tx, pharmacyId, op.payload);
      const cancelled = await this.returnsService.cancel(pharmacyId, userId, returnId, tx);
      return { returnId: cancelled.id };
    }
    if (op.operationType === 'RETURN_INSPECT') {
      const returnId = await this.resolveReturnId(tx, pharmacyId, op.payload);
      const line = await tx.saleReturnLine.findFirst({ where: { returnId, saleLineId: op.payload.saleLineId } });
      if (!line) throw new BadRequestException('Linha de devolucao nao encontrada.');
      await this.returnsService.inspectAndRelease(pharmacyId, userId, returnId, line.id, { condition: op.payload.condition, quantityToRelease: Number(op.payload.quantityToRelease) } as any);
      return { returnId };
    }
    if (op.operationType === 'REFUND') {
      const returnId = await this.resolveReturnId(tx, pharmacyId, op.payload);
      const line = await tx.saleReturnLine.findFirst({ where: { returnId, saleLineId: op.payload.saleLineId } });
      if (!line) throw new BadRequestException('Linha de devolucao nao encontrada.');
      const cashSessionId = await this.resolveCashSessionId(tx, pharmacyId, op.payload);
      const refund = await this.returnsService.refund(pharmacyId, userId, returnId, { returnLineId: line.id, salePaymentId: op.payload.salePaymentId, method: op.payload.method, amount: Number(op.payload.amount), cashSessionId, idempotencyKey: op.idempotencyKey } as any);
      return { refundId: refund.id };
    }
    if (op.operationType === 'EXPENSE_CONFIRM') {
      const expenseId = await this.resolveExpenseId(tx, pharmacyId, op.payload);
      const confirmed = await this.expensesService.confirm(pharmacyId, userId, expenseId, tx);
      return { expenseId: confirmed.id };
    }
    if (op.operationType === 'EXPENSE_CANCEL') {
      const cancelled = await this.expensesService.cancel(pharmacyId, userId, await this.resolveExpenseId(tx, pharmacyId, op.payload));
      return { expenseId: cancelled.id };
    }
    if (op.operationType === 'EXPENSE_UPDATE') {
      const updated = await this.expensesService.update(pharmacyId, userId, await this.resolveExpenseId(tx, pharmacyId, op.payload), op.payload.data);
      return { expenseId: updated.id };
    }
    if (op.operationType === 'RETURN_CONFIRM') {
      const returned = await this.returnsService.confirm(pharmacyId, userId, op.payload.returnId, tx);
      return { returnId: returned.id };
    }
    let sessionId: string | undefined = op.payload?.sessionId;
    if (!sessionId && op.payload?.openKey) {
      const openOp = await tx.syncOperation.findFirst({ where: { pharmacyId, idempotencyKey: op.payload.openKey, operationType: 'CASH_OPEN', status: 'PROCESSED' } });
      sessionId = (openOp?.result as any)?.cashSessionId;
    }
    if (!sessionId) throw new BadRequestException('Sessao de caixa nao encontrada para fecho.');
    await this.cashService.closeCash(pharmacyId, userId, sessionId, { countedBalance: Number(op.payload?.countedBalance), operatorId: op.payload?.operatorId || undefined } as any, tx);
    return { cashSessionId: sessionId };
  }

  private async ensureSyncClient(pharmacyId: string, clientId: string) {
    await this.prisma.syncClient.upsert({ where: { clientId }, update: {}, create: { clientId, pharmacyId, appVersion: '1.0.0', status: 'ACTIVE' } }).catch(() => undefined);
    return this.prisma.syncClient.findFirst({ where: { clientId, pharmacyId, status: 'ACTIVE' } });
  }

  async push(pharmacyId: string, userId: string, dto: SyncPushDto) {
    const minVersion = this.config.get<string>('minClientVersion') ?? '1.0.0';
    if (this.compareVersions(dto.appVersion, minVersion) < 0) {
      throw new UnprocessableEntityException({ code: 'CLIENT_VERSION_TOO_OLD', minVersion });
    }

    const client = await this.ensureSyncClient(pharmacyId, dto.clientId);
    if (!client) throw new NotFoundException('Cliente nao encontrado ou suspenso.');

    const results: any[] = [];
    for (const op of dto.operations) {
      const payloadSize = Buffer.byteLength(JSON.stringify(op.payload), 'utf8');
      if (payloadSize > MAX_PAYLOAD_BYTES) {
        results.push({ idempotencyKey: op.idempotencyKey, status: 'REJECTED', rejectionCode: 'PAYLOAD_TOO_LARGE', rejectionReason: `Payload excede ${MAX_PAYLOAD_BYTES} bytes.` });
        continue;
      }
      if (!['SALE', 'PAYMENT', 'CASH_OPEN'].concat(ADMIN_OPS).includes(op.operationType)) {
        results.push({ idempotencyKey: op.idempotencyKey, status: 'REJECTED', rejectionCode: 'UNSUPPORTED_OPERATION', rejectionReason: 'Apenas SALE e PAYMENT sao suportados.' });
        continue;
      }

      if (ADMIN_OPS.includes(op.operationType)) {
        const badField = findInvalidId(op.payload);
        if (badField) {
          results.push({ idempotencyKey: op.idempotencyKey, status: 'REJECTED', rejectionCode: 'INVALID_PAYLOAD', rejectionReason: `Identificador invalido em ${badField}.` });
          continue;
        }
      }

      let saleDto: SyncSalePayloadDto | null = null;
      let paymentDto: SyncPaymentPayloadDto | null = null;
      try {
        if (op.operationType === 'SALE') {
          saleDto = plainToInstance(SyncSalePayloadDto, op.payload);
          await validateOrReject(saleDto);
        } else if (op.operationType === 'CASH_OPEN') {
          const ob = Number(op.payload?.openingBalance);
          if (!Number.isFinite(ob) || ob < 0) throw new Error('openingBalance invalido');
        } else if (ADMIN_OPS.includes(op.operationType)) {
          if (!op.payload || typeof op.payload !== 'object') throw new Error('payload invalido');
        } else {
          paymentDto = plainToInstance(SyncPaymentPayloadDto, op.payload);
          await validateOrReject(paymentDto);
        }
      } catch {
        results.push({ idempotencyKey: op.idempotencyKey, status: 'REJECTED', rejectionCode: 'INVALID_PAYLOAD', rejectionReason: 'Payload invalido.' });
        continue;
      }

      const incomingHash = hashPayload(op.payload);
      const attemptId = randomUUID();

      let operationId: string | null = null;
      try {
        const created = await this.prisma.syncOperation.create({
          data: {
            pharmacyId,
            syncClientId: client.id,
            appVersion: dto.appVersion,
            operationType: op.operationType,
            idempotencyKey: op.idempotencyKey,
            payload: op.payload as Prisma.InputJsonValue,
            status: 'PENDING',
            processedAt: new Date(),
            attemptId,
          },
          select: { id: true },
        });
        operationId = created.id;
      } catch (e: any) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) {
          throw e;
        }
        const existing = await this.prisma.syncOperation.findUnique({
          where: { pharmacyId_idempotencyKey: { pharmacyId, idempotencyKey: op.idempotencyKey } },
        });
        if (!existing) {
          results.push({ idempotencyKey: op.idempotencyKey, status: 'REJECTED', rejectionCode: 'IDEMPOTENCY_RACE', rejectionReason: 'Corrida de idempotencia sem registo visivel.' });
          continue;
        }
        if (hashPayload(existing.payload) !== incomingHash) {
          results.push({ idempotencyKey: op.idempotencyKey, status: 'REJECTED', rejectionCode: 'IDEMPOTENCY_KEY_CONFLICT', rejectionReason: 'Chave reutilizada com conteudo diferente.' });
          continue;
        }
        if (existing.status !== 'PENDING') {
          results.push({ idempotencyKey: op.idempotencyKey, status: existing.status, result: existing.result, rejectionCode: existing.rejectionCode, rejectionReason: existing.rejectionReason });
          continue;
        }
        const cutoff = new Date(Date.now() - PENDING_ABANDON_MS);
        if (existing.processedAt !== null && existing.processedAt >= cutoff) {
          results.push({ idempotencyKey: op.idempotencyKey, status: 'PENDING', result: null, rejectionCode: null, rejectionReason: null });
          continue;
        }
        const claim = await this.prisma.syncOperation.updateMany({
          where: { id: existing.id, status: 'PENDING', processedAt: existing.processedAt, attemptId: existing.attemptId },
          data: { processedAt: new Date(), attemptId },
        });
        if (claim.count === 0) {
          results.push({ idempotencyKey: op.idempotencyKey, status: 'PENDING', result: null, rejectionCode: null, rejectionReason: null });
          continue;
        }
        operationId = existing.id;
      }

      let outcome: any;
      try {
      outcome = await withSyncOperationLock(this.prisma, pharmacyId, op.idempotencyKey, async (tx) => {
        const fence = await tx.syncOperation.findUnique({
          where: { id: operationId! },
          select: { attemptId: true, status: true, result: true, rejectionCode: true, rejectionReason: true },
        });
        if (!fence) {
          return { idempotencyKey: op.idempotencyKey, status: 'PENDING' as const, result: null, rejectionCode: null, rejectionReason: null };
        }
        if (fence.status !== 'PENDING') {
          return { idempotencyKey: op.idempotencyKey, status: fence.status, result: fence.result, rejectionCode: fence.rejectionCode, rejectionReason: fence.rejectionReason };
        }
        if (fence.attemptId !== attemptId) {
          return { idempotencyKey: op.idempotencyKey, status: 'PENDING' as const, result: null, rejectionCode: null, rejectionReason: null };
        }
        try {
          if (op.operationType === 'SALE') {
            const sale = await this.salesService.create(pharmacyId, userId, saleDto as any, tx);
            await this.salesService.confirm(pharmacyId, userId, sale.id, tx);
            const saleLines = await tx.saleLine.findMany({ where: { saleId: sale.id }, select: { id: true, productId: true, quantity: true } });
            const saleResult = { saleId: sale.id, status: 'CONFIRMED', lines: saleLines };
            const updated = await tx.syncOperation.updateMany({
              where: { id: operationId!, attemptId, status: 'PENDING' },
              data: { status: 'PROCESSED', result: saleResult as Prisma.InputJsonValue, processedAt: new Date() },
            });
            if (updated.count === 0) {
              const reread = await tx.syncOperation.findUnique({ where: { id: operationId! }, select: { status: true, result: true, rejectionCode: true, rejectionReason: true } });
              return { idempotencyKey: op.idempotencyKey, status: reread?.status ?? 'PENDING', result: reread?.result ?? { saleId: sale.id, status: 'CONFIRMED' }, rejectionCode: reread?.rejectionCode ?? null, rejectionReason: reread?.rejectionReason ?? null };
            }
            return { idempotencyKey: op.idempotencyKey, status: 'PROCESSED' as const, result: saleResult, rejectionCode: null, rejectionReason: null };
          } else if (op.operationType === 'CASH_OPEN') {
            const session = await this.cashService.openCash(pharmacyId, userId, { openingBalance: Number(op.payload.openingBalance), operatorId: op.payload.operatorId || undefined } as any, tx, true);
            await tx.syncOperation.updateMany({
              where: { id: operationId!, attemptId, status: 'PENDING' },
              data: { status: 'PROCESSED', result: { cashSessionId: session.id } as Prisma.InputJsonValue, processedAt: new Date() },
            });
            return { idempotencyKey: op.idempotencyKey, status: 'PROCESSED' as const, result: { cashSessionId: session.id }, rejectionCode: null, rejectionReason: null };
          } else if (ADMIN_OPS.includes(op.operationType)) {
            const extra = await this.runAdminOperation(op, pharmacyId, userId, tx);
            await tx.syncOperation.updateMany({ where: { id: operationId!, attemptId, status: 'PENDING' }, data: { status: 'PROCESSED', result: extra as Prisma.InputJsonValue, processedAt: new Date() } });
            return { idempotencyKey: op.idempotencyKey, status: 'PROCESSED' as const, result: extra, rejectionCode: null, rejectionReason: null };
          } else {
            const payment = await this.cashService.createPayment(pharmacyId, userId, {
              saleId: paymentDto!.saleId,
              method: paymentDto!.method as any,
              amount: paymentDto!.amount,
              idempotencyKey: op.idempotencyKey,
            } as any, tx);
            const updated = await tx.syncOperation.updateMany({
              where: { id: operationId!, attemptId, status: 'PENDING' },
              data: { status: 'PROCESSED', result: { paymentId: payment.id, saleId: payment.saleId } as Prisma.InputJsonValue, processedAt: new Date() },
            });
            if (updated.count === 0) {
              const reread = await tx.syncOperation.findUnique({ where: { id: operationId! }, select: { status: true, result: true, rejectionCode: true, rejectionReason: true } });
              return { idempotencyKey: op.idempotencyKey, status: reread?.status ?? 'PENDING', result: reread?.result ?? { paymentId: payment.id, saleId: payment.saleId }, rejectionCode: reread?.rejectionCode ?? null, rejectionReason: reread?.rejectionReason ?? null };
            }
            return { idempotencyKey: op.idempotencyKey, status: 'PROCESSED' as const, result: { paymentId: payment.id, saleId: payment.saleId }, rejectionCode: null, rejectionReason: null };
          }
        } catch (error: any) {
          const isBusinessError = error instanceof BadRequestException || error instanceof NotFoundException;
          if (!isBusinessError) {
            // Erro de infra: forcar rollback total da transaccao. Nenhum efeito de negocio deve ficar persistido.
            throw error;
          }
          const message = error?.message || 'Erro desconhecido.';
          const isStockError = message.toLowerCase().includes('stock') || message.toLowerCase().includes('expiry') || message.toLowerCase().includes('insuficiente');
          const rejectionCode = isStockError ? 'STOCK_CONFLICT' : (op.operationType === 'PAYMENT' ? 'PAYMENT_FAILED' : 'SALE_FAILED');
          const status = isStockError ? 'CONFLICT' : 'REJECTED';
          await tx.syncOperation.updateMany({
            where: { id: operationId!, attemptId, status: 'PENDING' },
            data: { status: status as any, rejectionCode, rejectionReason: message, processedAt: new Date() },
          }).catch(() => undefined);
          return { idempotencyKey: op.idempotencyKey, status, rejectionCode, rejectionReason: message };
        }
      });
      } catch (infraErr: any) {
        if (isTransientInfra(infraErr)) throw infraErr;
        const reason = 'Operacao com dados invalidos.';
        await this.prisma.syncOperation.updateMany({
          where: { pharmacyId, idempotencyKey: op.idempotencyKey, status: 'PENDING' },
          data: { status: 'REJECTED' as any, rejectionCode: 'INVALID_PAYLOAD', rejectionReason: reason, processedAt: new Date() },
        }).catch(() => undefined);
        outcome = { idempotencyKey: op.idempotencyKey, status: 'REJECTED', result: null, rejectionCode: 'INVALID_PAYLOAD', rejectionReason: reason };
      }
      results.push(outcome);
    }

    return { results };
  }
  async pull(pharmacyId: string, dto: SyncPullDto) {
    const client = await this.ensureSyncClient(pharmacyId, dto.clientId);
    if (!client) throw new NotFoundException('Cliente nao encontrado ou suspenso.');

    let cursorSeq = BigInt(0);
    if (dto.cursor) {
      try {
        const decoded = Buffer.from(dto.cursor, 'base64').toString('utf8');
        if (!/^\d+$/.test(decoded)) throw new Error();
        cursorSeq = BigInt(decoded);
      } catch {
        throw new BadRequestException({ code: 'INVALID_CURSOR', message: 'Cursor invalido.' });
      }
    }

    const limit = dto.limit ?? 50;

    const checkpoint = await this.prisma.syncCheckpoint.findUnique({ where: { pharmacyId } });
    const safeMax = checkpoint?.lastCommittedSequence ?? BigInt(0);

    if (safeMax <= cursorSeq) {
      return { changes: [], nextCursor: null, hasMore: false };
    }

    const events = await this.prisma.outboxEvent.findMany({
      where: { pharmacyId, sequence: { gt: cursorSeq, lte: safeMax } },
      orderBy: { sequence: 'asc' },
      take: limit + 1,
    });

    const hasMore = events.length > limit;
    const page = hasMore ? events.slice(0, limit) : events;
    const nextCursor = page.length > 0
      ? Buffer.from(page[page.length - 1].sequence.toString()).toString('base64')
      : null;

    return {
      changes: page.map(e => ({ type: e.entityType, action: e.action, data: (e.entityType === 'STOCK_LOT' || e.entityType === 'PRODUCT') && e.payload && typeof e.payload === 'object' ? ((p: any) => { const c: any = { ...p }; for (const k of ['unitCost', 'acquisitionCost', 'realUnitCost', 'purchaseId', 'referenceCost']) delete c[k]; return c; })(e.payload) : e.payload })),
      nextCursor,
      hasMore,
    };
  }

  async getOperation(pharmacyId: string, idempotencyKey: string, clientId: string) {
    const client = await this.ensureSyncClient(pharmacyId, clientId);
    if (!client) throw new NotFoundException('Cliente nao encontrado ou suspenso.');

    const op = await this.prisma.syncOperation.findFirst({
      where: { pharmacyId, idempotencyKey, syncClientId: client.id },
      select: {
        idempotencyKey: true,
        status: true,
        result: true,
        rejectionCode: true,
        rejectionReason: true,
        createdAt: true,
        processedAt: true,
      },
    });
    if (!op) throw new NotFoundException('Operacao de sincronizacao nao encontrada.');

    return {
      idempotencyKey: op.idempotencyKey,
      status: op.status,
      result: op.result ?? null,
      rejectionCode: op.rejectionCode ?? null,
      rejectionReason: op.rejectionReason ?? null,
      createdAt: op.createdAt,
      processedAt: op.processedAt,
    };
  }
  private compareVersions(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] || 0) > (pb[i] || 0)) return 1;
      if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    }
    return 0;
  }
}
