import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { ReceiveStockDto } from './dto/receive-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateLotDto } from './dto/create-lot.dto';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  async receiveStock(pharmacyId: string, actorId: string, dto: ReceiveStockDto) {
    return this.prisma.$transaction(async (tx) => {
      // Lock na purchase line para evitar recepÃ§Ãµes concorrentes
      const lines = await tx.$queryRaw`
        SELECT id, "purchaseId", "productId", quantity 
        FROM "purchase_lines" 
        WHERE id = ${dto.purchaseLineId}::uuid 
        FOR UPDATE
      ` as Array<{ id: string; purchaseId: string; productId: string; quantity: number }>;
      const line = lines[0];
      if (!line) throw new NotFoundException('Linha de compra nÃ£o encontrada.');

      const purchase = await tx.purchase.findUnique({ where: { id: line.purchaseId } });
      if (purchase?.pharmacyId !== pharmacyId) throw new NotFoundException('Compra nÃ£o encontrada.');
      if (purchase.status !== 'CONFIRMED') throw new BadRequestException('A compra precisa estar CONFIRMADA.');

      const totalReceived = await tx.stockLot.aggregate({
        where: { purchaseLineId: line.id },
        _sum: { quantityReceivedFromLine: true },
      });
      const alreadyReceived = totalReceived._sum.quantityReceivedFromLine || 0;
      if (alreadyReceived + dto.quantity > line.quantity) {
        throw new BadRequestException(
          `Quantidade excede o total comprado. Comprado: ${line.quantity}, JÃ¡ recebido: ${alreadyReceived}, Tentativa: ${dto.quantity}`,
        );
      }

      let lot = await tx.stockLot.findFirst({
        where: { pharmacyId, productId: line.productId, lotNumber: dto.lotNumber },
      });

      if (!lot) {
        lot = await tx.stockLot.create({
          data: {
            pharmacyId,
            productId: line.productId,
            purchaseLineId: line.id,
            lotNumber: dto.lotNumber,
            expiryDate: new Date(dto.expiryDate),
            quantityReceived: dto.quantity,
            quantityReceivedFromLine: dto.quantity,
            quantityAvailable: 0,
            unitCost: dto.unitCost,
            status: 'ACTIVE',
          },
        });
      } else {
        // Lock no lote existente
        await tx.$queryRaw`SELECT id FROM "stock_lots" WHERE id = ${lot.id}::uuid FOR UPDATE`;
        await tx.stockLot.update({
          where: { id: lot.id },
          data: {
            quantityReceived: { increment: dto.quantity },
            quantityReceivedFromLine: { increment: dto.quantity },
          },
        });
      }

      await tx.stockMovement.create({
        data: {
          pharmacyId,
          productId: line.productId,
          lotId: lot.id,
          type: 'PURCHASE_ENTRY',
          quantity: dto.quantity,
          referenceId: line.purchaseId,
          referenceType: 'Purchase',
          userId: actorId,
        },
      });

      const updatedLot = await tx.stockLot.update({
        where: { id: lot.id },
        data: { quantityAvailable: { increment: dto.quantity } },
      });

      await tx.auditLog.create({
        data: { pharmacyId, userId: actorId, action: 'stock.receive', entity: 'StockLot', entityId: lot.id },
      });

      return updatedLot;
    });
  }

  async createLot(pharmacyId: string, actorId: string, dto: CreateLotDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.findFirst({
          where: { id: dto.productId, pharmacyId },
          select: { id: true },
        });
        if (!product) throw new NotFoundException('Produto nÃ£o encontrado.');

        const expiryDate = new Date(dto.expiryDate);
        if (isNaN(expiryDate.getTime())) {
          throw new BadRequestException('Data de validade invÃ¡lida.');
        }

        const existing = await tx.stockLot.findUnique({
          where: {
            pharmacyId_productId_lotNumber: {
              pharmacyId,
              productId: dto.productId,
              lotNumber: dto.lotNumber,
            },
          },
        });
        if (existing) {
          throw new BadRequestException(
            `JÃ¡ existe um lote com o nÃºmero "${dto.lotNumber}" para este produto.`,
          );
        }

        const lot = await tx.stockLot.create({
          data: {
            pharmacyId,
            productId: dto.productId,
            purchaseLineId: null,
            lotNumber: dto.lotNumber,
            expiryDate,
            quantityReceived: dto.quantity,
            quantityReceivedFromLine: 0,
            quantityAvailable: dto.quantity,
            unitCost: dto.unitCost,
            status: 'ACTIVE',
          },
        });

        await tx.stockMovement.create({
          data: {
            pharmacyId,
            productId: dto.productId,
            lotId: lot.id,
            type: 'DIRECT_ENTRY',
            quantity: dto.quantity,
            referenceId: lot.id,
            referenceType: 'StockLot',
            userId: actorId,
            notes: 'Entrada directa de lote',
          },
        });

        await tx.auditLog.create({
          data: {
            pharmacyId,
            userId: actorId,
            action: 'stock.lot.create',
            entity: 'StockLot',
            entityId: lot.id,
          },
        });

        return lot;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          `JÃ¡ existe um lote com o nÃºmero "${dto.lotNumber}" para este produto.`,
        );
      }
      throw error;
    }
  }

  async adjustStock(pharmacyId: string, actorId: string, dto: AdjustStockDto) {
    return this.prisma.$transaction(async (tx) => {
      // Lock explÃ­cito do lote para evitar concorrÃªncia
      const lots = await tx.$queryRaw`
        SELECT * FROM "stock_lots" 
        WHERE id = ${dto.lotId}::uuid AND "pharmacyId" = ${pharmacyId}::uuid
        FOR UPDATE
      ` as Array<{ id: string; productId: string; quantityAvailable: number }>;
      const lot = lots[0];
      if (!lot) throw new NotFoundException('Lote nÃ£o encontrado.');

      if (dto.quantity === 0) throw new BadRequestException('Ajuste com quantidade zero nÃ£o Ã© permitido.');
      if (lot.quantityAvailable + dto.quantity < 0) {
        throw new BadRequestException('Ajuste resultaria em stock negativo.');
      }

      await tx.stockMovement.create({
        data: {
          pharmacyId,
          productId: lot.productId,
          lotId: lot.id,
          type: dto.quantity > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
          quantity: dto.quantity,
          notes: dto.reason,
          userId: actorId,
        },
      });

      const updatedLot = await tx.stockLot.update({
        where: { id: lot.id },
        data: { quantityAvailable: { increment: dto.quantity } },
      });

      await tx.auditLog.create({
        data: { pharmacyId, userId: actorId, action: 'stock.adjust', entity: 'StockLot', entityId: lot.id },
      });

      return updatedLot;
    });
  }

  async getLots(pharmacyId: string, productId?: string) {
    return this.prisma.stockLot.findMany({
      where: { pharmacyId, ...(productId && { productId }) },
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async getMovements(pharmacyId: string, productId?: string) {
    return this.prisma.stockMovement.findMany({
      where: { pharmacyId, ...(productId && { productId }) },
      orderBy: { createdAt: 'desc' },
    });
  }
}
