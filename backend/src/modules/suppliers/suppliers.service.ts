// @ts-nocheck
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Prisma } from '@prisma/client';
import { calcOf, purchaseCalcInclude } from '../purchases/purchase-calc';

function statsOf(purchases: any[]) {
  const ok = purchases.filter((p) => p.status === 'CONFIRMED');
  let total = 0;
  let debt = 0;
  let last: Date | null = null;
  for (const p of ok) {
    const c = calcOf(p);
    total += c.due;
    debt += c.outstanding;
    if (!last || p.purchaseDate > last) last = p.purchaseDate;
  }
  return {
    totalPurchased: Math.round(total * 100) / 100,
    purchaseCount: ok.length,
    lastPurchaseDate: last,
    debt: Math.round(debt * 100) / 100,
  };
}

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(pharmacyId: string, actorId: string, dto: CreateSupplierDto) {
    return this.prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.create({
        data: { ...dto, pharmacyId },
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

    const ids = data.map((s) => s.id);
    const purchases = ids.length
      ? await this.prisma.purchase.findMany({
          where: { pharmacyId, supplierId: { in: ids }, status: 'CONFIRMED' },
          include: purchaseCalcInclude,
        })
      : [];
    const bySupplier = new Map<string, any[]>();
    for (const p of purchases) {
      const arr = bySupplier.get(p.supplierId) ?? [];
      arr.push(p);
      bySupplier.set(p.supplierId, arr);
    }

    return {
      data: data.map((s) => ({ ...s, ...statsOf(bySupplier.get(s.id) ?? []) })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(pharmacyId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, pharmacyId } });
    if (!supplier) throw new NotFoundException('Fornecedor não encontrado.');
    return supplier;
  }

  async getSummary(pharmacyId: string, id: string) {
    const supplier = await this.findOne(pharmacyId, id);

    const purchases = await this.prisma.purchase.findMany({
      where: { pharmacyId, supplierId: id },
      include: {
        ...purchaseCalcInclude,
        boxes: { select: { acquisitionCost: true, totalUnits: true, productId: true, product: { select: { name: true } } } },
        lines: { select: { subtotal: true, quantity: true, unitCost: true, productId: true, product: { select: { name: true } } } },
      },
      orderBy: { purchaseDate: 'desc' },
    });

    const live = purchases.filter((p) => p.status !== 'CANCELLED');

    const rows = live.map((p) => {
      const c = calcOf(p);
      return {
        id: p.id,
        documentNumber: p.documentNumber,
        purchaseDate: p.purchaseDate,
        status: p.status,
        paymentStatus: c.paymentStatus,
        dueDate: p.dueDate,
        currency: p.currency,
        dueMzn: c.due,
        paidTotal: c.paidTotal,
        outstanding: c.outstanding,
      };
    });

    const seen = new Map<string, any>();
    for (const p of live) {
      for (const b of p.boxes) {
        if (!seen.has(b.productId) && b.acquisitionCost !== null && b.totalUnits > 0) {
          seen.set(b.productId, {
            productId: b.productId,
            name: b.product?.name ?? '',
            lastUnitCost: Math.round((Number(b.acquisitionCost) / b.totalUnits) * 100) / 100,
            lastQuantity: b.totalUnits,
            lastDate: p.purchaseDate,
          });
        }
      }
      for (const l of p.lines) {
        if (!seen.has(l.productId)) {
          seen.set(l.productId, {
            productId: l.productId,
            name: l.product?.name ?? '',
            lastUnitCost: Number(l.unitCost),
            lastQuantity: l.quantity,
            lastDate: p.purchaseDate,
          });
        }
      }
    }

    const pays = await this.prisma.supplierPayment.findMany({
      where: { pharmacyId, supplierId: id },
      include: { purchase: { select: { documentNumber: true } } },
      orderBy: { paidAt: 'desc' },
    });
    const userIds = Array.from(new Set(pays.map((x) => x.userId)));
    const users = userIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    return {
      supplier,
      summary: statsOf(purchases),
      purchases: rows,
      products: Array.from(seen.values()),
      payments: pays.map((x) => ({
        id: x.id,
        amount: x.amount,
        paidFrom: x.paidFrom,
        method: x.method,
        paidAt: x.paidAt,
        notes: x.notes,
        purchase: x.purchase,
        user: userById.get(x.userId) ? { fullName: userById.get(x.userId).fullName } : null,
      })),
    };
  }

  async update(pharmacyId: string, actorId: string, id: string, dto: UpdateSupplierDto) {
    await this.findOne(pharmacyId, id);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.supplier.update({ where: { id }, data: dto });
      await tx.auditLog.create({
        data: { pharmacyId, userId: actorId, action: 'supplier.update', entity: 'Supplier', entityId: id },
      });
      return updated;
    });
  }
}