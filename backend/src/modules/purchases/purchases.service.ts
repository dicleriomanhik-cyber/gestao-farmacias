import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { Prisma } from '@prisma/client';
import { SupplierPaymentsService } from './supplier-payments.service';
import { paidSum, purchaseDueMzn, round2, statusFor } from './purchase-math';
import { recomputeLotCosts } from './purchase-costs';
import { resolveLineProducts, lineInput } from './purchase-lines';
import { InvoiceLineDto } from './dto/invoice-line.dto';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService, private payments: SupplierPaymentsService) {}

  async create(pharmacyId: string, actorId: string, dto: CreatePurchaseDto) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id: dto.supplierId, pharmacyId } });
    if (!supplier) throw new BadRequestException('Fornecedor inválido ou não pertence a esta farmácia.');
    if (supplier.status === 'INACTIVE') throw new BadRequestException('Fornecedor inactivo não pode ser usado.');

    const st = await this.prisma.pharmacySettings.upsert({ where: { pharmacyId }, update: {}, create: { pharmacyId } });
    const currency = st.multiCurrency ? (dto.currency ?? 'MZN') : 'MZN';
    const exchangeRate = currency === 'MZN' ? 1 : (dto.exchangeRate ?? 0);
    if (!(exchangeRate > 0)) throw new BadRequestException('Indica o câmbio para a moeda escolhida.');
    const paymentStatus = st.usePayables ? (dto.paymentStatus ?? 'PAID') : 'PAID';
    const dueDate = paymentStatus === 'CREDIT' && dto.dueDate ? new Date(dto.dueDate) : null;

    const lineList = dto.lines ?? [];
    const productIds = lineList.map(l => l.productId).filter((x): x is string => !!x);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds }, pharmacyId } });
    if (products.length !== new Set(productIds).size) throw new BadRequestException('Um ou mais produtos são inválidos.');

    let totalAmount = 0;
    const linesData = lineList.map(line => {
      const subtotal = (line.quantity * line.unitCost) - (line.discount || 0);
      if (subtotal < 0) throw new BadRequestException('Desconto superior ao valor da linha.');
      totalAmount += subtotal;
      return {
        productId: line.productId, productName: line.productName, type: line.type, strength: line.strength, innerCount: line.innerCount, unitsPerInner: line.unitsPerInner, unitsPerBox: line.unitsPerBox,
        quantity: line.quantity,
        unitCost: line.unitCost,
        discount: line.discount || 0,
        subtotal,
      };
    });

    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          pharmacyId,
          supplierId: dto.supplierId,
          documentNumber: dto.documentNumber,
          notes: dto.notes,
          totalAmount,
          transportCost: dto.transportCost ?? 0,
          otherCosts: dto.otherCosts ?? 0,
          invoiceTotal: dto.invoiceTotal ?? null,
          currency,
          exchangeRate,
          paymentStatus: paymentStatus as any,
          dueDate,
          status: 'DRAFT',
          lines: { create: await resolveLineProducts(tx, pharmacyId, actorId, linesData) },
        },
        include: { lines: true },
      });

      await tx.auditLog.create({
        data: { pharmacyId, userId: actorId, action: 'purchase.create', entity: 'Purchase', entityId: purchase.id },
      });

      return purchase;
    });
  }

  async findAll(pharmacyId: string, page: number = 1, limit: number = 20, status?: string, supplierId?: string) {
    const where: Prisma.PurchaseWhereInput = {
      pharmacyId,
      ...(status && { status: status as any }),
      ...(supplierId && { supplierId }),
    };
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchase.findMany({
        where: { pharmacyId },
        skip, take: limit,
        include: { supplier: { select: { name: true } }, supplierPayments: { select: { amount: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchase.count({ where }),
    ]);
    const rows = data.map(({ supplierPayments, ...p }) => {
      const dueMzn = purchaseDueMzn(p);
      const paidTotal = paidSum(supplierPayments);
      return { ...p, dueMzn, paidTotal, outstanding: p.paymentStatus === 'PAID' ? 0 : Math.max(0, round2(dueMzn - paidTotal)) };
    });
    return { data: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(pharmacyId: string, id: string) {
    const base = await this.findOneBase(pharmacyId, id);
    const goods = Number(base.totalAmount);
    const inv = base.invoiceTotal === null ? null : Number(base.invoiceTotal);
    const conference = {
      invoiceTotal: inv,
      goodsTotal: goods,
      diff: inv === null ? null : round2(goods - inv),
      matches: inv === null ? null : Math.abs(goods - inv) < 0.005,
      boxCount: base.stockLots.length,
    };
    const lines = base.lines.map((l) => ({ ...l, received: base.stockLots.filter((x) => x.purchaseLineId === l.id).length, unitPrice: l.unitsPerBox ? Math.round((Number(l.unitCost) / l.unitsPerBox) * 10000) / 10000 : null }));
    const costs = { transport: Number(base.transportCost), other: Number(base.otherCosts) };
    const totals = { goods, ...costs, grand: round2(goods + costs.transport + costs.other), currency: base.currency };
    return { ...base, lines, boxes: base.stockLots, conference, totals };
  }

  private async lockLine(tx: any, pharmacyId: string, lineId: string) {
    await tx.$queryRaw`SELECT id FROM "purchase_lines" WHERE id = ${lineId}::uuid FOR UPDATE`;
    const line = await tx.purchaseLine.findUnique({ where: { id: lineId }, include: { purchase: { select: { pharmacyId: true, status: true } } } });
    if (!line || line.purchase.pharmacyId !== pharmacyId) throw new NotFoundException('Linha da fatura nao encontrada.');
    if (line.purchase.status !== 'CONFIRMED') throw new BadRequestException('A fatura precisa de estar confirmada.');
    if (line.closed) throw new BadRequestException('Esta linha ja esta fechada.');
    return line;
  }

  async registerDamaged(pharmacyId: string, actorId: string, lineId: string, quantity: number, note?: string) {
    return this.prisma.$transaction(async (tx) => {
      const line = await this.lockLine(tx, pharmacyId, lineId);
      const received = await tx.stockLot.count({ where: { purchaseLineId: lineId } });
      if (received + line.quantityDamaged + quantity > line.quantity) {
        throw new BadRequestException(`So faltam ${line.quantity - received - line.quantityDamaged} caixas nesta linha.`);
      }
      const updated = await tx.purchaseLine.update({
        where: { id: lineId },
        data: { quantityDamaged: { increment: quantity }, ...(note ? { damageNote: note } : {}) },
      });
      await tx.auditLog.create({ data: { pharmacyId, userId: actorId, action: 'purchase.line.damaged', entity: 'PurchaseLine', entityId: lineId } });
      return updated;
    });
  }

  async closeLine(pharmacyId: string, actorId: string, lineId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockLine(tx, pharmacyId, lineId);
      const updated = await tx.purchaseLine.update({ where: { id: lineId }, data: { closed: true } });
      await tx.auditLog.create({ data: { pharmacyId, userId: actorId, action: 'purchase.line.closed', entity: 'PurchaseLine', entityId: lineId } });
      return updated;
    });
  }
  async findOneBase(pharmacyId: string, id: string) {
    const p = await this.findOneRaw(pharmacyId, id);
    const dueMzn = purchaseDueMzn(p);
    const paidTotal = paidSum(p.supplierPayments);
    return { ...p, dueMzn, paidTotal, outstanding: p.paymentStatus === 'PAID' ? 0 : Math.max(0, round2(dueMzn - paidTotal)) };
  }

  private async findOneRaw(pharmacyId: string, id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, pharmacyId },
      include: { lines: { include: { product: true } }, supplier: true, supplierPayments: { orderBy: { paidAt: 'desc' } }, stockLots: { select: { id: true, purchaseLineId: true, qrCode: true, totalUnits: true, acquisitionCost: true, product: { select: { name: true } } }, orderBy: { createdAt: 'asc' } } },
    });
    if (!purchase) throw new NotFoundException('Compra não encontrada.');
    return purchase;
  }

  async update(pharmacyId: string, actorId: string, id: string, dto: UpdatePurchaseDto) {
    const purchase = await this.findOne(pharmacyId, id);
    if (purchase.status === 'CANCELLED') throw new BadRequestException('Compra cancelada não pode ser editada.');
    const draft = purchase.status === 'DRAFT';
    const rest: any = { ...dto };
    delete rest.paymentStatus;
    const lockedKeys = ['supplierId', 'documentNumber', 'currency', 'exchangeRate'];
    if (!draft && lockedKeys.some((k) => rest[k] !== undefined)) throw new BadRequestException('Fornecedor, documento e moeda só se alteram em rascunho.');
    const data: any = {};
    for (const k of ['transportCost', 'otherCosts', 'invoiceTotal', 'notes', ...lockedKeys]) if (rest[k] !== undefined) data[k] = rest[k];
    if (rest.dueDate !== undefined) data.dueDate = rest.dueDate ? new Date(rest.dueDate) : null;
    if (data.supplierId && !(await this.prisma.supplier.findFirst({ where: { id: data.supplierId, pharmacyId } }))) throw new BadRequestException('Fornecedor inválido.');

    return this.prisma.$transaction(async (tx) => {
      let updated = await tx.purchase.update({ where: { id }, data });
      await recomputeLotCosts(tx, id);
      if (!draft && (purchase.paymentStatus !== 'PAID' || purchase.paidTotal > 0)) {
        updated = await tx.purchase.update({ where: { id }, data: { paymentStatus: statusFor(purchaseDueMzn(updated), purchase.paidTotal) } });
      }
      await tx.auditLog.create({
        data: { pharmacyId, userId: actorId, action: 'purchase.update', entity: 'Purchase', entityId: id },
      });
      return updated;
    });
  }

  async replaceLines(pharmacyId: string, actorId: string, id: string, lines: InvoiceLineDto[]) {
    const purchase = await this.findOne(pharmacyId, id);
    if (purchase.status !== 'DRAFT') throw new BadRequestException('S\u00f3 se alteram as linhas de uma fatura em rascunho.');
    if (purchase.stockLots.length > 0) throw new BadRequestException('Esta fatura j\u00e1 tem caixas registadas.');
    const inputs = lines.map((l) => lineInput(l));
    await this.prisma.$transaction(async (tx) => {
      const resolved = await resolveLineProducts(tx, pharmacyId, actorId, inputs);
      await tx.purchaseLine.deleteMany({ where: { purchaseId: id } });
      if (resolved.length > 0) await tx.purchaseLine.createMany({ data: resolved.map((l) => ({ ...l, purchaseId: id })) });
      const total = round2(resolved.reduce((s, l) => s + l.subtotal, 0));
      await tx.purchase.update({ where: { id }, data: { totalAmount: total } });
      await tx.auditLog.create({
        data: { pharmacyId, userId: actorId, action: 'purchase.lines', entity: 'Purchase', entityId: id },
      });
    });
    return this.findOne(pharmacyId, id);
  }

  async confirm(pharmacyId: string, actorId: string, id: string, pay?: { paidFrom: string; method: string }) {
    const purchase = await this.findOne(pharmacyId, id);
    if (purchase.status !== 'DRAFT') throw new BadRequestException('Apenas rascunhos podem ser confirmados.');
    if (Number(purchase.totalAmount) <= 0) throw new BadRequestException('Acrescenta pelo menos uma linha antes de confirmar a compra.');

    return this.prisma.$transaction(async (tx) => {
      const updated: any = await tx.purchase.update({ where: { id }, data: { status: 'CONFIRMED' } }); updated.conference = purchase.conference;
      if (pay && purchase.paymentStatus === 'PAID' && purchase.dueMzn > 0) {
        await this.payments.pay(pharmacyId, actorId, { purchaseId: id, amount: purchase.dueMzn, paidFrom: pay.paidFrom, method: pay.method }, tx, true);
      }
      await tx.auditLog.create({
        data: { pharmacyId, userId: actorId, action: 'purchase.confirm', entity: 'Purchase', entityId: id },
      });
      return updated;
    });
  }

  async cancel(pharmacyId: string, actorId: string, id: string) {
    const purchase = await this.findOne(pharmacyId, id);
    if (purchase.paidTotal > 0) throw new BadRequestException('Compra com pagamentos não pode ser cancelada.');
    if (purchase.stockLots.length > 0) throw new BadRequestException('Compra com caixas registadas não pode ser cancelada.');
    if (purchase.status === 'CANCELLED') throw new BadRequestException('Compra já cancelada.');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.purchase.update({ where: { id }, data: { status: 'CANCELLED' } });
      await tx.auditLog.create({
        data: { pharmacyId, userId: actorId, action: 'purchase.cancel', entity: 'Purchase', entityId: id },
      });
      return updated;
    });
  }
}