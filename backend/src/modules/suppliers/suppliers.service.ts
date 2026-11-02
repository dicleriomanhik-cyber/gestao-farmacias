import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Prisma } from '@prisma/client';
import { paidSum, purchaseDueMzn, round2 } from '../purchases/purchase-math';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(pharmacyId: string, actorId: string, dto: CreateSupplierDto) {
    return this.prisma.$transaction(async (tx) => {
      // Separa explicitamente os campos para evitar conflito entre CreateInput/UncheckedCreateInput
      const { name, taxId, phone, whatsapp, email, address, city, province, notes, status } = dto;
      const supplier = await tx.supplier.create({
        data: {
          name,
          taxId,
          phone,
          whatsapp,
          email,
          address,
          city,
          province,
          notes,
          status,
          pharmacy: { connect: { id: pharmacyId } },
        },
      });
      await tx.auditLog.create({
        data: { pharmacyId, userId: actorId, action: 'supplier.create', entity: 'Supplier', entityId: supplier.id },
      });
      return supplier;
    });
  }

  async findAll(pharmacyId: string, page: number = 1, limit: number = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.SupplierWhereInput = {
      pharmacyId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { taxId: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.supplier.count({ where }),
    ]);

    const stats = await this.stats(pharmacyId, data.map((s) => s.id));
    return { data: data.map((s) => ({ ...s, ...stats.get(s.id) })), meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(pharmacyId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, pharmacyId } });
    if (!supplier) throw new NotFoundException('Fornecedor não encontrado.');
    return supplier;
  }

  private async stats(pharmacyId: string, ids: string[]) {
    const out = new Map<string, { totalPurchased: number; purchaseCount: number; lastPurchaseDate: Date | null; debt: number }>();
    for (const id of ids) out.set(id, { totalPurchased: 0, purchaseCount: 0, lastPurchaseDate: null, debt: 0 });
    if (!ids.length) return out;
    const purchases = await this.prisma.purchase.findMany({
      where: { pharmacyId, supplierId: { in: ids }, status: 'CONFIRMED' },
      include: { supplierPayments: { select: { amount: true } } },
    });
    for (const p of purchases) {
      const s = out.get(p.supplierId)!;
      const due = purchaseDueMzn(p);
      s.totalPurchased = round2(s.totalPurchased + due);
      s.purchaseCount += 1;
      if (!s.lastPurchaseDate || p.purchaseDate > s.lastPurchaseDate) s.lastPurchaseDate = p.purchaseDate;
      if (p.paymentStatus !== 'PAID') s.debt = round2(s.debt + Math.max(0, round2(due - paidSum(p.supplierPayments))));
    }
    return out;
  }

  async summary(pharmacyId: string, id: string) {
    const supplier = await this.findOne(pharmacyId, id);
    const stats = (await this.stats(pharmacyId, [id])).get(id)!;
    const purchases = await this.prisma.purchase.findMany({
      where: { pharmacyId, supplierId: id },
      include: {
        supplierPayments: { select: { amount: true } },
        lines: { include: { product: { select: { id: true, name: true } } } },
      },
      orderBy: { purchaseDate: 'desc' },
    });

    const purchaseRows = purchases.map((p) => {
      const dueMzn = purchaseDueMzn(p);
      const paidTotal = paidSum(p.supplierPayments);
      return {
        id: p.id,
        documentNumber: p.documentNumber,
        purchaseDate: p.purchaseDate,
        status: p.status,
        paymentStatus: p.paymentStatus,
        dueDate: p.dueDate,
        currency: p.currency,
        dueMzn,
        paidTotal,
        outstanding: p.paymentStatus === 'PAID' ? 0 : Math.max(0, round2(dueMzn - paidTotal)),
      };
    });

    const productsMap = new Map<string, { productId: string; name: string; lastUnitCost: number; lastQuantity: number; lastDate: Date }>();
    for (const p of purchases) {
      if (p.status !== 'CONFIRMED') continue;
      for (const l of p.lines) {
        const cur = productsMap.get(l.productId);
        if (!cur || p.purchaseDate > cur.lastDate) {
          productsMap.set(l.productId, {
            productId: l.productId,
            name: l.product.name,
            lastUnitCost: round2(Number(l.unitCost) * Number(p.exchangeRate)),
            lastQuantity: l.quantity,
            lastDate: p.purchaseDate,
          });
        }
      }
    }

    const payments = await this.prisma.supplierPayment.findMany({
      where: { pharmacyId, supplierId: id },
      include: { purchase: { select: { documentNumber: true } }, user: { select: { fullName: true } } },
      orderBy: { paidAt: 'desc' },
    });

    return { supplier, summary: stats, purchases: purchaseRows, products: Array.from(productsMap.values()), payments };
  }

  async update(pharmacyId: string, actorId: string, id: string, dto: UpdateSupplierDto) {
    await this.findOne(pharmacyId, id);
    return this.prisma.$transaction(async (tx) => {
      const { name, taxId, phone, whatsapp, email, address, city, province, notes, status } = dto;
      const updated = await tx.supplier.update({
        where: { id },
        data: { name, taxId, phone, whatsapp, email, address, city, province, notes, status },
      });
      await tx.auditLog.create({
        data: { pharmacyId, userId: actorId, action: 'supplier.update', entity: 'Supplier', entityId: id },
      });
      return updated;
    });
  }
}