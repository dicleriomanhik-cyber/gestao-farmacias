// @ts-nocheck
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SupplierPaymentsService } from '../supplier-payments/supplier-payments.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { ConfirmPurchaseDto } from './dto/confirm-purchase.dto';
import { calcOf, purchaseCalcInclude } from './purchase-calc';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService, private payments: SupplierPaymentsService) {}

  private enrich(p: any) {
    const c = calcOf(p);
    return {
      ...p,
      totalAmount: c.goods,
      dueMzn: c.due,
      paidTotal: c.paidTotal,
      outstanding: c.outstanding,
      paymentStatus: c.paymentStatus,
      conference: c.conference,
    };
  }

  async create(pharmacyId: string, actorId: string, dto: CreatePurchaseDto) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id: dto.supplierId, pharmacyId } });
    if (!supplier) throw new BadRequestException('Fornecedor inválido ou não pertence a esta farmácia.');
    if (supplier.status === 'INACTIVE') throw new BadRequestException('Fornecedor inactivo não pode ser usado.');

    const settings = await this.prisma.pharmacySettings.findUnique({ where: { pharmacyId } });
    const currency = String(dto.currency ?? 'MZN').toUpperCase();
    if (dto.paymentStatus === 'CREDIT' && !settings?.usePayables) {
      throw new BadRequestException('Ativa "Usar contas a pagar" em Definições para registar compras a prazo.');
    }
    if (currency !== 'MZN') {
      if (!settings?.multiCurrency) throw new BadRequestException('Ativa "Comprar noutras moedas" em Definições.');
      if (!dto.exchangeRate || dto.exchangeRate <= 0) throw new BadRequestException('Indica o câmbio para metical.');
    }

    const lines = dto.lines ?? [];
    if (lines.length > 0) {
      const productIds = lines.map((l) => l.productId);
      const products = await this.prisma.product.findMany({ where: { id: { in: productIds }, pharmacyId } });
      if (new Set(productIds).size !== products.length) throw new BadRequestException('Um ou mais produtos são inválidos.');
    }
    const linesData = lines.map((line) => {
      const subtotal = line.quantity * line.unitCost - (line.discount || 0);
      if (subtotal < 0) throw new BadRequestException('Desconto superior ao valor da linha.');
      return { productId: line.productId, quantity: line.quantity, unitCost: line.unitCost, discount: line.discount || 0, subtotal };
    });
    const linesTotal = linesData.reduce((a, l) => a + l.subtotal, 0);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const purchase = await tx.purchase.create({
          data: {
            pharmacyId,
            supplierId: dto.supplierId,
            documentNumber: dto.documentNumber.trim(),
            notes: dto.notes,
            totalAmount: linesTotal,
            transportCost: dto.transportCost ?? 0,
            otherCosts: dto.otherCosts ?? 0,
            invoiceTotal: dto.invoiceTotal ?? null,
            currency,
            exchangeRate: currency === 'MZN' ? 1 : dto.exchangeRate,
            paymentStatus: dto.paymentStatus === 'CREDIT' ? 'CREDIT' : 'PAID',
            dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
            status: 'DRAFT',
            lines: { create: linesData },
          },
        });
        await tx.auditLog.create({
          data: { pharmacyId, userId: actorId, action: 'purchase.create', entity: 'Purchase', entityId: purchase.id },
        });
        return purchase;
      });
      return this.findOne(pharmacyId, created.id);
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('Já existe uma compra deste fornecedor com este número de fatura.');
      }
      throw e;
    }
  }

  async findAll(pharmacyId: string, page: number = 1, limit: number = 20, status?: string, supplierId?: string) {
    const skip = (page - 1) * limit;
    const where: any = { pharmacyId, ...(status && { status }), ...(supplierId && { supplierId }) };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchase.findMany({
        where,
        skip,
        take: limit,
        include: { ...purchaseCalcInclude, supplier: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchase.count({ where }),
    ]);
    return { data: data.map((p) => this.enrich(p)), meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(pharmacyId: string, id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, pharmacyId },
      include: {
        lines: { include: { product: true } },
        supplier: true,
        boxes: {
          select: { id: true, qrCode: true, totalUnits: true, acquisitionCost: true, product: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
        supplierPayments: { orderBy: { paidAt: 'desc' } },
      },
    });
    if (!purchase) throw new NotFoundException('Compra não encontrada.');
    return this.enrich(purchase);
  }

  async update(pharmacyId: string, actorId: string, id: string, dto: UpdatePurchaseDto) {
    const current = await this.prisma.purchase.findFirst({ where: { id, pharmacyId } });
    if (!current) throw new NotFoundException('Compra não encontrada.');
    if (current.status === 'CANCELLED') throw new BadRequestException('Compra cancelada não pode ser editada.');

    const data: any = {};
    if (dto.transportCost !== undefined) data.transportCost = dto.transportCost;
    if (dto.otherCosts !== undefined) data.otherCosts = dto.otherCosts;
    if (dto.invoiceTotal !== undefined) data.invoiceTotal = dto.invoiceTotal;
    if (dto.dueDate !== undefined) data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.notes !== undefined) data.notes = dto.notes;

    await this.prisma.$transaction(async (tx) => {
      await tx.purchase.update({ where: { id }, data });
      const fresh = await tx.purchase.findFirst({ where: { id }, include: purchaseCalcInclude });
      const c = calcOf(fresh);
      if (fresh.status === 'CONFIRMED' && c.paymentStatus !== fresh.paymentStatus) {
        await tx.purchase.update({ where: { id }, data: { paymentStatus: c.paymentStatus } });
      }
      await tx.auditLog.create({
        data: { pharmacyId, userId: actorId, action: 'purchase.update', entity: 'Purchase', entityId: id },
      });
    });
    return this.findOne(pharmacyId, id);
  }

  async confirm(pharmacyId: string, actorId: string, id: string, body?: ConfirmPurchaseDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "purchases" WHERE id = ${id}::uuid AND "pharmacyId" = ${pharmacyId}::uuid FOR UPDATE`;
      const purchase = await tx.purchase.findFirst({ where: { id, pharmacyId }, include: purchaseCalcInclude });
      if (!purchase) throw new NotFoundException('Compra não encontrada.');
      if (purchase.status !== 'DRAFT') throw new BadRequestException('Apenas rascunhos podem ser confirmados.');

      const c = calcOf(purchase);
      if (c.goods <= 0) throw new BadRequestException('Regista pelo menos uma caixa antes de confirmar.');

      let paymentStatus = 'CREDIT';
      if (purchase.paymentStatus === 'PAID') {
        if (!body?.paidFrom || !body?.method) throw new BadRequestException('Indica com o que foi paga a compra.');
        await this.payments.pay(tx, pharmacyId, actorId, purchase, c.due, body.paidFrom, body.method, null);
        paymentStatus = 'PAID';
      }

      const updated = await tx.purchase.update({ where: { id }, data: { status: 'CONFIRMED', paymentStatus } });
      await tx.auditLog.create({
        data: { pharmacyId, userId: actorId, action: 'purchase.confirm', entity: 'Purchase', entityId: id },
      });
      return updated;
    });
  }

  async cancel(pharmacyId: string, actorId: string, id: string) {
    const purchase = await this.prisma.purchase.findFirst({ where: { id, pharmacyId }, include: purchaseCalcInclude });
    if (!purchase) throw new NotFoundException('Compra não encontrada.');
    if (purchase.status === 'CANCELLED') throw new BadRequestException('Compra já cancelada.');
    if ((purchase.supplierPayments ?? []).length > 0) throw new BadRequestException('Compra com pagamentos registados não pode ser cancelada.');
    if ((purchase.boxes ?? []).length > 0) throw new BadRequestException('Compra com caixas registadas não pode ser cancelada.');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.purchase.update({ where: { id }, data: { status: 'CANCELLED' } });
      await tx.auditLog.create({
        data: { pharmacyId, userId: actorId, action: 'purchase.cancel', entity: 'Purchase', entityId: id },
      });
      return updated;
    });
  }
}