import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { emitOutboxEvent } from '../sync/outbox.helper';
import { CreateInventoryDto, SaveInventoryCountsDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async list(pharmacyId: string) {
    const rows = await this.prisma.inventoryCount.findMany({
      where: { pharmacyId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { lines: { select: { expectedQty: true, countedQty: true, appliedDiff: true } } },
    });
    return rows.map((r) => {
      const done = r.status === 'COMPLETED';
      const counted = r.lines.filter((l) => l.countedQty !== null);
      const divergent = done
        ? r.lines.filter((l) => (l.appliedDiff ?? 0) !== 0)
        : counted.filter((l) => l.countedQty !== l.expectedQty);
      const net = done
        ? r.lines.reduce((a, l) => a + (l.appliedDiff ?? 0), 0)
        : counted.reduce((a, l) => a + ((l.countedQty as number) - l.expectedQty), 0);
      return {
        id: r.id,
        status: r.status,
        notes: r.notes,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
        totalLines: r.lines.length,
        countedLines: counted.length,
        divergentLines: divergent.length,
        netDifference: net,
      };
    });
  }

  async get(pharmacyId: string, id: string) {
    const count = await this.prisma.inventoryCount.findFirst({
      where: { id, pharmacyId },
      include: {
        lines: {
          include: {
            lot: {
              select: {
                qrCode: true,
                expiryDate: true,
                totalUnits: true,
                product: { select: { name: true, type: true } },
              },
            },
          },
        },
      },
    });
    if (!count) throw new NotFoundException('Inventário não encontrado.');
    const lines = count.lines
      .map((l) => ({
        id: l.id,
        lotId: l.lotId,
        qrCode: l.lot.qrCode,
        productName: l.lot.product.name,
        type: l.lot.product.type,
        expiryDate: l.lot.expiryDate,
        totalUnits: l.lot.totalUnits,
        expectedQty: l.expectedQty,
        countedQty: l.countedQty,
        appliedDiff: l.appliedDiff,
      }))
      .sort((a, b) => a.productName.localeCompare(b.productName) || a.qrCode.localeCompare(b.qrCode));
    return {
      id: count.id,
      status: count.status,
      notes: count.notes,
      createdAt: count.createdAt,
      completedAt: count.completedAt,
      lines,
    };
  }

  async create(pharmacyId: string, actorId: string, dto: CreateInventoryDto) {
    const open = await this.prisma.inventoryCount.findFirst({
      where: { pharmacyId, status: 'OPEN' },
      select: { id: true },
    });
    if (open) throw new BadRequestException('Já existe um inventário aberto. Conclua ou cancele-o primeiro.');
    const lots = await this.prisma.stockLot.findMany({
      where: { pharmacyId, quantityAvailable: { gt: 0 } },
      select: { id: true, productId: true, quantityAvailable: true },
    });
    if (lots.length === 0) throw new BadRequestException('Não há caixas com stock para inventariar.');
    return this.prisma.inventoryCount.create({
      data: {
        pharmacyId,
        notes: dto.notes?.trim() || null,
        createdById: actorId,
        lines: {
          create: lots.map((l) => ({ lotId: l.id, productId: l.productId, expectedQty: l.quantityAvailable })),
        },
      },
      select: { id: true },
    });
  }

  async saveCounts(pharmacyId: string, id: string, dto: SaveInventoryCountsDto) {
    const count = await this.prisma.inventoryCount.findFirst({
      where: { id, pharmacyId },
      select: { status: true, lines: { select: { id: true, lot: { select: { totalUnits: true } } } } },
    });
    if (!count) throw new NotFoundException('Inventário não encontrado.');
    if (count.status !== 'OPEN') throw new BadRequestException('Este inventário já não está aberto.');
    const limits = new Map(count.lines.map((l) => [l.id, l.lot.totalUnits]));
    for (const l of dto.lines) {
      const limit = limits.get(l.lineId);
      if (limit === undefined) throw new BadRequestException('Linha não pertence a este inventário.');
      if (l.countedQty != null && l.countedQty > limit) {
        throw new BadRequestException(`Quantidade contada (${l.countedQty}) excede o total da caixa (${limit}).`);
      }
    }
    await this.prisma.$transaction(
      dto.lines.map((l) =>
        this.prisma.inventoryCountLine.update({ where: { id: l.lineId }, data: { countedQty: l.countedQty ?? null } }),
      ),
    );
    return { saved: dto.lines.length };
  }

  async complete(pharmacyId: string, actorId: string, id: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const rows = (await tx.$queryRaw`
          SELECT id, status FROM "inventory_counts"
          WHERE id = ${id}::uuid AND "pharmacyId" = ${pharmacyId}::uuid
          FOR UPDATE
        `) as Array<{ id: string; status: string }>;
        const row = rows[0];
        if (!row) throw new NotFoundException('Inventário não encontrado.');
        if (row.status !== 'OPEN') throw new BadRequestException('Este inventário já não está aberto.');

        const lines = await tx.inventoryCountLine.findMany({ where: { countId: id } });
        let adjusted = 0;
        let pending = 0;

        for (const line of lines) {
          if (line.countedQty === null) {
            pending++;
            continue;
          }
          const locked = (await tx.$queryRaw`
            SELECT "quantityAvailable", "totalUnits" FROM "stock_lots"
            WHERE id = ${line.lotId}::uuid AND "pharmacyId" = ${pharmacyId}::uuid
            FOR UPDATE
          `) as Array<{ quantityAvailable: number; totalUnits: number }>;
          const lot = locked[0];
          if (!lot) throw new NotFoundException('Caixa não encontrada.');
          if (line.countedQty > lot.totalUnits) {
            throw new BadRequestException(`Quantidade contada (${line.countedQty}) excede o total da caixa (${lot.totalUnits}).`);
          }
          const diff = line.countedQty - lot.quantityAvailable;
          await tx.inventoryCountLine.update({ where: { id: line.id }, data: { appliedDiff: diff } });
          if (diff === 0) continue;

          await tx.stockMovement.create({
            data: {
              pharmacyId,
              productId: line.productId,
              lotId: line.lotId,
              type: 'INVENTORY_ADJUSTMENT',
              quantity: diff,
              referenceId: id,
              referenceType: 'InventoryCount',
              notes: `Inventário: contado ${line.countedQty}, sistema ${lot.quantityAvailable}`,
              userId: actorId,
            },
          });
          const updatedLot = await tx.stockLot.update({
            where: { id: line.lotId },
            data: { quantityAvailable: line.countedQty },
          });
          await emitOutboxEvent(tx, pharmacyId, 'STOCK_LOT', updatedLot.id, 'UPDATED', updatedLot as any);
          adjusted++;
        }

        await tx.inventoryCount.update({
          where: { id },
          data: { status: 'COMPLETED', completedAt: new Date(), completedById: actorId },
        });
        await tx.auditLog.create({
          data: {
            pharmacyId,
            userId: actorId,
            action: 'stock.inventory.complete',
            entity: 'InventoryCount',
            entityId: id,
            metadata: { adjusted, pending },
          },
        });
        return { id, adjusted, pending };
      },
      { timeout: 60000, maxWait: 10000 },
    );
  }

  async cancel(pharmacyId: string, actorId: string, id: string) {
    const r = await this.prisma.inventoryCount.updateMany({
      where: { id, pharmacyId, status: 'OPEN' },
      data: { status: 'CANCELLED', completedAt: new Date(), completedById: actorId },
    });
    if (r.count === 0) throw new BadRequestException('Inventário não encontrado ou já não está aberto.');
    return { id };
  }
}