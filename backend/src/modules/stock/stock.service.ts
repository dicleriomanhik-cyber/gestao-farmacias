// @ts-nocheck
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ReceiveStockDto } from './dto/receive-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateBoxDto } from './dto/create-box.dto';
import { derivePackState } from './pack-state.helper';
import { Prisma } from '@prisma/client';

function saleUnitLabel(type: string | null | undefined): string {
  return type === 'MEDICINE' ? 'carteira' : 'unidade';
}
@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  async receiveStock(pharmacyId: string, actorId: string, dto: ReceiveStockDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Bloquear a PurchaseLine para evitar concorrÃªncia na receÃ§Ã£o
      const lines = await tx.$queryRaw`
        SELECT id, "purchaseId", "productId", quantity 
        FROM "purchase_lines" 
        WHERE id = ${dto.purchaseLineId}::uuid 
        FOR UPDATE
      `;
      const line = lines[0];
      if (!line) throw new NotFoundException('Linha de compra nÃ£o encontrada.');

      // Validar se a compra estÃ¡ confirmada
      const purchase = await tx.purchase.findUnique({ where: { id: line.purchaseId } });
      if (purchase?.pharmacyId !== pharmacyId) throw new NotFoundException('Compra nÃ£o encontrada.');
      if (purchase.status !== 'CONFIRMED') throw new BadRequestException('A compra precisa estar CONFIRMADA.');

      // 2. Validar quantidade mÃ¡xima recebida
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
        // Bloquear o lote existente para a atualizaÃ§Ã£o
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

      // 5. Atualizar quantidade disponÃ­vel
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
      // 1. Lock explÃ­cito do lote (FOR UPDATE)
      const lots = await tx.$queryRaw`
        SELECT * FROM "stock_lots" 
        WHERE id = ${dto.lotId}::uuid AND "pharmacyId" = ${pharmacyId}::uuid
        FOR UPDATE
      `;
      const lot = lots[0];
      if (!lot) throw new NotFoundException('Lote nÃ£o encontrado.');

      if (dto.quantity === 0) throw new BadRequestException('Ajuste com quantidade zero nÃ£o Ã© permitido.');
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

      // 3. Atualizar quantidade disponÃ­vel
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
      include: { product: { select: { name: true, sku: true, type: true, dosageForm: true } } },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async getMovements(pharmacyId: string, productId?: string) {
    return this.prisma.stockMovement.findMany({
      where: { pharmacyId, ...(productId && { productId }) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBox(pharmacyId: string, actorId: string, dto: CreateBoxDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
      let product: { id: string; type: string; hasExpiry: boolean } | null = null;
      if (dto.productId) {
        product = await tx.product.findFirst({
          where: { id: dto.productId, pharmacyId },
          select: { id: true, type: true, hasExpiry: true },
        });
      } else if (dto.productName) {
        const matches = await tx.product.findMany({
          where: { pharmacyId, name: { equals: dto.productName.trim(), mode: 'insensitive' }, status: 'ACTIVE' },
          select: { id: true, type: true, hasExpiry: true },
          take: 2,
        });
        if (matches.length > 1) throw new BadRequestException('Existe mais de um produto com este nome. Use o produto correto.');
        product = matches[0] ?? null;
      }
      if (!product) throw new NotFoundException('Produto nao encontrado.');
      if (dto.expiryDate && product.hasExpiry === false) {
        throw new BadRequestException('Produto sem validade nao aceita expiryDate.');
      }
      if (product.hasExpiry && !dto.expiryDate) {
        throw new BadRequestException('expiryDate obrigatoria para este produto.');
      }

      let innerCount: number | null = null;
      let unitsPerInner: number | null = null;
      let totalUnits: number;

      if (product.type === 'MEDICINE') {
        if (!dto.innerCount || !dto.unitsPerInner) {
          throw new BadRequestException('MEDICINE requer innerCount e unitsPerInner.');
        }
        if (dto.totalUnits !== undefined && dto.totalUnits !== dto.innerCount * dto.unitsPerInner) {
          throw new BadRequestException('totalUnits deve ser innerCount * unitsPerInner.');
        }
        innerCount = dto.innerCount;
        unitsPerInner = dto.unitsPerInner;
        totalUnits = innerCount * unitsPerInner;
      } else {
        if (!dto.totalUnits) {
          throw new BadRequestException('PRODUCT requer totalUnits.');
        }
        totalUnits = dto.totalUnits;
      }

      let purchaseId: string | null = null;
      if (dto.purchaseId) {
        const purchase = await tx.purchase.findFirst({ where: { id: dto.purchaseId, pharmacyId } });
        if (!purchase) throw new NotFoundException('Compra nao encontrada.');
        if (purchase.status !== 'DRAFT') throw new BadRequestException('So se registam caixas numa compra em rascunho.');
        purchaseId = purchase.id;
      }
      const lotNumber = dto.lotNumber ?? dto.qrCode;

      const lot = await tx.stockLot.create({
        data: {
          pharmacyId,
          productId: product.id,
          lotNumber,
          qrCode: dto.qrCode,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
          quantityReceived: totalUnits,
          quantityReceivedFromLine: 0,
          quantityAvailable: totalUnits,
          innerCount,
          unitsPerInner,
          totalUnits,
          unitCost: dto.unitCost ?? (dto.acquisitionCost != null ? Math.round((dto.acquisitionCost / totalUnits) * 100) / 100 : 0),
          purchaseId,
          acquisitionCost: dto.acquisitionCost ?? null,
          status: 'ACTIVE',
        },
      });

      await tx.stockMovement.create({
        data: {
          pharmacyId,
          productId: product.id,
          lotId: lot.id,
          type: 'DIRECT_ENTRY',
          quantity: totalUnits,
          referenceId: lot.id,
          referenceType: 'StockLot',
          userId: actorId,
          notes: 'Entrada directa de caixa (createBox)',
        },
      });

      await tx.auditLog.create({
        data: { pharmacyId, userId: actorId, action: 'stock.box.create', entity: 'StockLot', entityId: lot.id },
      });
      if (purchaseId) {
        const agg = await tx.stockLot.aggregate({ where: { purchaseId }, _sum: { acquisitionCost: true } });
        const lineAgg = await tx.purchaseLine.aggregate({ where: { purchaseId }, _sum: { subtotal: true } });
        await tx.purchase.update({ where: { id: purchaseId }, data: { totalAmount: Number(agg._sum.acquisitionCost ?? 0) + Number(lineAgg._sum.subtotal ?? 0) } });
      }

      return lot;
      });
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('QR Code ou lotNumber duplicado nesta farmacia.');
      }
      throw e;
    }
  }

  async getBoxes(
    pharmacyId: string,
    page: number = 1,
    limit: number = 20,
    typeFilter?: string,
    stateFilter?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { pharmacyId };
    if (typeFilter) where.product = { type: typeFilter };

    const now = new Date();
    if (stateFilter === 'DEPLETED') where.quantityAvailable = 0;
    else if (stateFilter === 'EXPIRED') {
      where.expiryDate = { lt: now };
      where.quantityAvailable = { gt: 0 };
    } else if (stateFilter === 'ACTIVE') {
      where.quantityAvailable = { gt: 0 };
      where.OR = [{ expiryDate: null }, { expiryDate: { gte: now } }];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.stockLot.findMany({
        where,
        skip,
        take: limit,
        include: { product: { select: { name: true, type: true, hasExpiry: true, strength: true, salePrice: true } } },
        orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.stockLot.count({ where }),
    ]);

    return {
      data: data.map((lot) => {
        const expired = lot.expiryDate && lot.expiryDate < now;
        const state = lot.quantityAvailable === 0 ? 'DEPLETED' : expired ? 'EXPIRED' : lot.quantityAvailable === lot.totalUnits ? 'NEW' : 'ACTIVE';
        return {
          id: lot.id,
          qrCode: lot.qrCode,
          productName: lot.product.name,
          type: lot.product.type,
          strength: lot.product.strength,
          salePrice: lot.product.salePrice,
          saleUnitLabel: saleUnitLabel(lot.product.type),
          hasExpiry: lot.product.hasExpiry,
          expiryDate: lot.expiryDate,
          innerCount: lot.innerCount,
          unitsPerInner: lot.unitsPerInner,
          totalUnits: lot.totalUnits,
          quantityAvailable: lot.quantityAvailable,
          state,
        };
      }),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getBox(pharmacyId: string, id: string) {
    const lot = await this.prisma.stockLot.findFirst({
      where: { id, pharmacyId },
      include: { product: { select: { name: true, type: true, hasExpiry: true, strength: true, salePrice: true } } },
    });
    if (!lot) throw new NotFoundException('Caixa nao encontrada.');

    const packs = lot.product.type === 'MEDICINE' && lot.unitsPerInner
      ? derivePackState(lot.totalUnits, lot.unitsPerInner, lot.quantityAvailable)
      : null;

    const movements = await this.prisma.stockMovement.findMany({
      where: { lotId: lot.id, type: 'SALE' },
      orderBy: { createdAt: 'asc' },
    });

    const saleIds = Array.from(new Set(movements.map((m) => m.referenceId).filter(Boolean) as string[]));
    const sales = saleIds.length
      ? await this.prisma.sale.findMany({
          where: { id: { in: saleIds }, pharmacyId },
          select: { id: true, saleNumber: true, createdAt: true },
        })
      : [];
    const salesById = new Map(sales.map((s) => [s.id, s]));

    let running = lot.totalUnits;
    const salesHistory = movements.map((m) => {
      const units = Math.abs(m.quantity);
      running -= units;
      const s = m.referenceId ? salesById.get(m.referenceId) : undefined;
      return {
        saleId: m.referenceId,
        saleNumber: s?.saleNumber ?? null,
        soldAt: s?.createdAt ?? m.createdAt,
        units,
        balanceAfter: running,
      };
    });

    const now = new Date();
    const expired = lot.expiryDate && lot.expiryDate < now;
    const state = lot.quantityAvailable === 0 ? 'DEPLETED' : expired ? 'EXPIRED' : lot.quantityAvailable === lot.totalUnits ? 'NEW' : 'ACTIVE';

    return {
      id: lot.id,
      qrCode: lot.qrCode,
      lotNumber: lot.lotNumber,
      productName: lot.product.name,
      type: lot.product.type,
      saleUnitLabel: saleUnitLabel(lot.product.type),
      hasExpiry: lot.product.hasExpiry,
      expiryDate: lot.expiryDate,
      innerCount: lot.innerCount,
      unitsPerInner: lot.unitsPerInner,
      totalUnits: lot.totalUnits,
      quantityAvailable: lot.quantityAvailable,
      state,
      packs: packs ? packs.packs : null,
      currentPackNumber: packs ? packs.currentPackNumber : null,
      salesHistory,
    };
  }

}
