// @ts-nocheck
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ReceiveStockDto } from './dto/receive-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  async receiveStock(pharmacyId: string, actorId: string, dto: ReceiveStockDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Bloquear a PurchaseLine para evitar concorrência na receção
      const lines = await tx.$queryRaw`
        SELECT id, "purchaseId", "productId", quantity 
        FROM "purchase_lines" 
        WHERE id = ${dto.purchaseLineId}::uuid 
        FOR UPDATE
      `;
      const line = lines[0];
      if (!line) throw new NotFoundException('Linha de compra não encontrada.');

      // Validar se a compra está confirmada
      const purchase = await tx.purchase.findUnique({ where: { id: line.purchaseId } });
      if (purchase?.pharmacyId !== pharmacyId) throw new NotFoundException('Compra não encontrada.');
      if (purchase.status !== 'CONFIRMED') throw new BadRequestException('A compra precisa estar CONFIRMADA.');

      // 2. Validar quantidade máxima recebida
      const totalReceived = await tx.stockLot.aggregate({
        where: { purchaseLineId: line.id },
        _sum: { quantityReceivedFromLine: true },
      });
      const alreadyReceived = totalReceived._sum.quantityReceivedFromLine || 0;
      if (alreadyReceived + dto.quantity > line.quantity) {
        throw new BadRequestException(`Quantidade excede o total comprado (${line.quantity}).`);
      }

      // 3. Lock do StockLot (se existir) ou criar novo
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
        // Bloquear o lote existente para a atualização
        await tx.$queryRaw`SELECT id FROM "stock_lots" WHERE id = ${lot.id}::uuid FOR UPDATE`;
        await tx.stockLot.update({
          where: { id: lot.id },
          data: {
            quantityReceived: { increment: dto.quantity },
            quantityReceivedFromLine: { increment: dto.quantity },
          },
        });
      }

      // 4. Criar Movimento
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

      // 5. Atualizar quantidade disponível
      const updatedLot = await tx.stockLot.update({
        where: { id: lot.id },
        data: { quantityAvailable: { increment: dto.quantity } },
      });

      // 6. Auditoria
      await tx.auditLog.create({
        data: { pharmacyId, userId: actorId, action: 'stock.receive', entity: 'StockLot', entityId: lot.id },
      });

      return updatedLot;
    });
  }

  async adjustStock(pharmacyId: string, actorId: string, dto: AdjustStockDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock explícito do lote (FOR UPDATE)
      const lots = await tx.$queryRaw`
        SELECT * FROM "stock_lots" 
        WHERE id = ${dto.lotId}::uuid AND "pharmacyId" = ${pharmacyId}::uuid
        FOR UPDATE
      `;
      const lot = lots[0];
      if (!lot) throw new NotFoundException('Lote não encontrado.');

      if (dto.quantity === 0) throw new BadRequestException('Ajuste com quantidade zero não é permitido.');
      if (lot.quantityAvailable + dto.quantity < 0) {
        throw new BadRequestException('Ajuste resultaria em stock negativo.');
      }

      // 2. Criar Movimento
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

      // 3. Atualizar quantidade disponível
      const updatedLot = await tx.stockLot.update({
        where: { id: lot.id },
        data: { quantityAvailable: { increment: dto.quantity } },
      });

      // 4. Auditoria
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