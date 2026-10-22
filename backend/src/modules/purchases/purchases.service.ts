import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  async create(pharmacyId: string, actorId: string, dto: CreatePurchaseDto) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id: dto.supplierId, pharmacyId } });
    if (!supplier) throw new BadRequestException('Fornecedor inválido ou não pertence a esta farmácia.');
    if (supplier.status === 'INACTIVE') throw new BadRequestException('Fornecedor inactivo não pode ser usado.');

    const productIds = dto.lines.map(l => l.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds }, pharmacyId } });
    if (products.length !== productIds.length) throw new BadRequestException('Um ou mais produtos são inválidos.');

    let totalAmount = 0;
    const linesData = dto.lines.map(line => {
      const subtotal = (line.quantity * line.unitCost) - (line.discount || 0);
      if (subtotal < 0) throw new BadRequestException('Desconto superior ao valor da linha.');
      totalAmount += subtotal;
      return {
        productId: line.productId,
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
          status: 'DRAFT',
          lines: { create: linesData },
        },
        include: { lines: true },
      });

      await tx.auditLog.create({
        data: { pharmacyId, userId: actorId, action: 'purchase.create', entity: 'Purchase', entityId: purchase.id },
      });

      return purchase;
    });
  }

  async findAll(pharmacyId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchase.findMany({
        where: { pharmacyId },
        skip, take: limit,
        include: { supplier: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchase.count({ where: { pharmacyId } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(pharmacyId: string, id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, pharmacyId },
      include: { lines: { include: { product: true } }, supplier: true },
    });
    if (!purchase) throw new NotFoundException('Compra não encontrada.');
    return purchase;
  }

  async update(pharmacyId: string, actorId: string, id: string, dto: UpdatePurchaseDto) {
    const purchase = await this.findOne(pharmacyId, id);
    if (purchase.status !== 'DRAFT') throw new BadRequestException('Apenas compras em rascunho podem ser editadas.');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.purchase.update({ where: { id }, data: dto });
      await tx.auditLog.create({
        data: { pharmacyId, userId: actorId, action: 'purchase.update', entity: 'Purchase', entityId: id },
      });
      return updated;
    });
  }

  async confirm(pharmacyId: string, actorId: string, id: string) {
    const purchase = await this.findOne(pharmacyId, id);
    if (purchase.status !== 'DRAFT') throw new BadRequestException('Apenas rascunhos podem ser confirmados.');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.purchase.update({ where: { id }, data: { status: 'CONFIRMED' } });
      await tx.auditLog.create({
        data: { pharmacyId, userId: actorId, action: 'purchase.confirm', entity: 'Purchase', entityId: id },
      });
      return updated;
    });
  }

  async cancel(pharmacyId: string, actorId: string, id: string) {
    const purchase = await this.findOne(pharmacyId, id);
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