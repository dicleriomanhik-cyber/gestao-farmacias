import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { InspectReturnDto } from './dto/inspect-return.dto';
import { RefundDto } from './dto/refund.dto';
import { ConfirmRefundDto } from './dto/confirm-refund.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReturnsService {
  constructor(private prisma: PrismaService) {}

  async create(pharmacyId: string, userId: string, dto: CreateReturnDto) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: dto.saleId, pharmacyId },
        include: { lines: true },
      });
      if (!sale) throw new NotFoundException('Venda nÃ£o encontrada.');
      if (sale.status !== 'CONFIRMED') throw new BadRequestException('Apenas vendas confirmadas podem ser devolvidas.');

      let totalRefund = new Decimal(0);
      const linesData = [];

      for (const lineDto of dto.lines) {
        const saleLine = sale.lines.find(l => l.id === lineDto.saleLineId);
        if (!saleLine) throw new BadRequestException(`Linha de venda ${lineDto.saleLineId} nÃ£o encontrada.`);

        const previousReturns = await tx.saleReturnLine.aggregate({
          where: { saleLineId: saleLine.id, return: { status: 'CONFIRMED' } },
          _sum: { quantity: true },
        });
        const returnedQty = previousReturns._sum.quantity || 0;

        if (returnedQty + lineDto.quantity > saleLine.quantity) {
          throw new BadRequestException(`Quantidade a devolver excede a vendida para o produto ${saleLine.productId}.`);
        }

        const unitPrice = saleLine.unitPrice;
        const discount = saleLine.discount;
        const subtotal = new Decimal(unitPrice).mul(lineDto.quantity).sub(
          new Decimal(discount).div(saleLine.quantity).mul(lineDto.quantity)
        );

        totalRefund = totalRefund.add(subtotal);

        linesData.push({
          saleLineId: saleLine.id,
          productId: saleLine.productId,
          quantity: lineDto.quantity,
          unitPrice,
          discount,
          subtotal,
          lotNumber: lineDto.lotNumber,
          expiryDate: lineDto.expiryDate ? new Date(lineDto.expiryDate) : null,
        });
      }

      const count = await tx.saleReturn.count({ where: { pharmacyId } });
      const returnNumber = `DEV-${String(count + 1).padStart(6, '0')}`;

      return await tx.saleReturn.create({
        data: {
          pharmacyId,
          saleId: sale.id,
          userId,
          returnNumber,
          reason: dto.reason,
          totalRefund,
          status: 'DRAFT',
          lines: { create: linesData },
        },
        include: { lines: true },
      });
    });
  }

  async findAll(pharmacyId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.saleReturn.findMany({
        where: { pharmacyId },
        skip, take: limit,
        include: { lines: { include: { product: true } }, sale: { select: { saleNumber: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.saleReturn.count({ where: { pharmacyId } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async listQuarantine(pharmacyId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.quarantineStock.findMany({
        where: { pharmacyId },
        skip,
        take: limit,
        include: { product: true, saleReturnLine: { include: { return: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quarantineStock.count({ where: { pharmacyId } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
  async findOne(pharmacyId: string, id: string) {
    const saleReturn = await this.prisma.saleReturn.findFirst({
      where: { id, pharmacyId },
      include: { lines: true },
    });
    if (!saleReturn) throw new NotFoundException('DevoluÃ§Ã£o nÃ£o encontrada.');
    return saleReturn;
  }

  async confirm(pharmacyId: string, userId: string, returnId: string) {
    return this.prisma.$transaction(async (tx) => {
      const returns = await tx.$queryRaw`
        SELECT * FROM "sale_returns" 
        WHERE id = ${returnId}::uuid AND "pharmacyId" = ${pharmacyId}::uuid 
        FOR UPDATE
      ` as Array<{ id: string; saleId: string; status: string }>;
      const saleReturn = returns[0];
      if (!saleReturn) throw new NotFoundException('DevoluÃ§Ã£o nÃ£o encontrada.');
      if (saleReturn.status !== 'DRAFT') throw new BadRequestException('Apenas rascunhos podem ser confirmados.');

      await tx.$queryRaw`SELECT id FROM "sales" WHERE id = ${saleReturn.saleId}::uuid FOR UPDATE`;

      const lines = await tx.saleReturnLine.findMany({ where: { returnId } });
      
      for (const line of lines) {
        await tx.quarantineStock.create({
          data: {
            pharmacyId,
            productId: line.productId,
            saleReturnLineId: line.id,
            lotNumber: line.lotNumber || 'DESCONHECIDO',
            expiryDate: line.expiryDate ? new Date(line.expiryDate) : new Date('2099-12-31'),
            quantityReceived: line.quantity,
            unitCost: 0,
            status: 'PENDING_INSPECTION',
          }
        });

        await tx.stockMovement.create({
          data: {
            pharmacyId,
            productId: line.productId,
            type: 'SALE_RETURN',
            quantity: line.quantity,
            referenceId: returnId,
            referenceType: 'SaleReturn',
            userId,
            notes: 'Entrada em quarentena',
          }
        });
      }

      const updated = await tx.saleReturn.update({
        where: { id: returnId },
        data: { status: 'CONFIRMED' },
      });

      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'sale.return.confirm', entity: 'SaleReturn', entityId: returnId },
      });

      return updated;
    });
  }

  async inspectAndRelease(pharmacyId: string, userId: string, returnId: string, lineId: string, dto: InspectReturnDto) {
    return this.prisma.$transaction(async (tx) => {
      const quarantines = await tx.$queryRaw`
        SELECT * FROM "quarantine_stock" 
        WHERE "saleReturnLineId" = ${lineId}::uuid AND "pharmacyId" = ${pharmacyId}::uuid 
        FOR UPDATE
      ` as Array<{ id: string; productId: string; lotNumber: string; expiryDate: Date; quantityReceived: number; quantityInspected: number; unitCost: Decimal }>;
      const q = quarantines[0];
      if (!q) throw new NotFoundException('Registo de quarentena nÃ£o encontrado.');
      
      const availableToInspect = q.quantityReceived - q.quantityInspected;
      if (dto.quantityToRelease > availableToInspect) {
        throw new BadRequestException('Quantidade superior ao disponÃ­vel para inspeÃ§Ã£o.');
      }

      if (dto.condition === 'RESELLABLE') {
        if (q.lotNumber === 'DESCONHECIDO' || !q.expiryDate) {
          throw new BadRequestException('NÃ£o Ã© possÃ­vel libertar artigo sem lote e validade verificÃ¡veis.');
        }

        let lot = await tx.stockLot.findFirst({
          where: { pharmacyId, productId: q.productId, lotNumber: q.lotNumber }
        });

        if (!lot) {
          lot = await tx.stockLot.create({
            data: {
              pharmacyId,
              productId: q.productId,
              lotNumber: q.lotNumber,
              expiryDate: q.expiryDate,
              quantityReceived: dto.quantityToRelease,
              quantityAvailable: dto.quantityToRelease,
              unitCost: q.unitCost,
              status: 'ACTIVE',
            }
          });
        } else {
          await tx.stockLot.update({
            where: { id: lot.id },
            data: { 
              quantityReceived: { increment: dto.quantityToRelease },
              quantityAvailable: { increment: dto.quantityToRelease }
            }
          });
        }

        await tx.stockMovement.create({
          data: {
            pharmacyId,
            productId: q.productId,
            lotId: lot.id,
            type: 'ADJUSTMENT_IN',
            quantity: dto.quantityToRelease,
            referenceId: returnId,
            referenceType: 'SaleReturn',
            userId,
          }
        });

        await tx.quarantineStock.update({
          where: { id: q.id },
          data: {
            quantityInspected: { increment: dto.quantityToRelease },
            quantityReleased: { increment: dto.quantityToRelease },
            status: 'RESELLABLE',
          }
        });

      } else {
        await tx.quarantineStock.update({
          where: { id: q.id },
          data: {
            quantityInspected: { increment: dto.quantityToRelease },
            quantityDamaged: { increment: dto.quantityToRelease },
            status: dto.condition,
          }
        });
      }

      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'sale.return.inspect', entity: 'QuarantineStock', entityId: q.id },
      });
    });
  }

  async refund(pharmacyId: string, userId: string, returnId: string, dto: RefundDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const returns = await tx.$queryRaw`
          SELECT * FROM "sale_returns" 
          WHERE id = ${returnId}::uuid AND "pharmacyId" = ${pharmacyId}::uuid 
          FOR UPDATE
        ` as Array<{ id: string; saleId: string; status: string; totalRefund: Decimal; returnNumber: string }>;
        const saleReturn = returns[0];
        if (!saleReturn) throw new NotFoundException('DevoluÃ§Ã£o nÃ£o encontrada.');
        if (saleReturn.status !== 'CONFIRMED') throw new BadRequestException('DevoluÃ§Ã£o nÃ£o confirmada.');

        const returnLine = await tx.saleReturnLine.findFirst({
          where: { id: dto.returnLineId, returnId: saleReturn.id },
        });
        if (!returnLine) throw new BadRequestException('Linha de devoluÃ§Ã£o nÃ£o encontrada.');

        const salePayment = await tx.salePayment.findFirst({
          where: { id: dto.salePaymentId, saleId: saleReturn.saleId },
        });
        if (!salePayment) throw new BadRequestException('Pagamento original nÃ£o encontrado.');

        if (salePayment.method !== dto.method) {
          throw new BadRequestException(`MÃ©todo de reembolso (${dto.method}) nÃ£o coincide com o pagamento original (${salePayment.method}).`);
        }

        if (dto.idempotencyKey) {
          const existing = await tx.returnRefund.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
          if (existing) return existing;
        }

        const refundsForPayment = await tx.returnRefund.aggregate({
          where: { salePaymentId: salePayment.id, status: { in: ['PENDING', 'COMPLETED'] } },
          _sum: { amount: true },
        });
        const refundsForLine = await tx.returnRefund.aggregate({
          where: { returnLineId: returnLine.id, status: { in: ['PENDING', 'COMPLETED'] } },
          _sum: { amount: true },
        });

        const totalRefundedPayment = refundsForPayment._sum.amount || new Decimal(0);
        const totalRefundedLine = refundsForLine._sum.amount || new Decimal(0);

        const availableFromPayment = new Decimal(salePayment.amount).sub(totalRefundedPayment);
        const availableFromLine = new Decimal(returnLine.subtotal).sub(totalRefundedLine);

        const eligibleAmount = availableFromPayment.lt(availableFromLine) ? availableFromPayment : availableFromLine;

        if (new Decimal(dto.amount).gt(eligibleAmount)) {
          throw new BadRequestException(`Valor excede o saldo reembolsÃ¡vel (${eligibleAmount.toFixed(2)}).`);
        }

        let cashSessionId = dto.cashSessionId;
        let status: 'PENDING' | 'COMPLETED' = 'PENDING';

        if (dto.method === 'CASH') {
          if (!cashSessionId) throw new BadRequestException('SessÃ£o de caixa obrigatÃ³ria para reembolso em dinheiro.');
          const session = await tx.cashSession.findFirst({ where: { id: cashSessionId, pharmacyId, status: 'OPEN' } });
          if (!session) throw new BadRequestException('SessÃ£o de caixa invÃ¡lida ou fechada.');
          status = 'COMPLETED';
        }

        const refund = await tx.returnRefund.create({
          data: {
            returnLineId: returnLine.id,
            salePaymentId: salePayment.id,
            method: dto.method,
            status,
            amount: dto.amount,
            idempotencyKey: dto.idempotencyKey,
            cashSessionId: dto.method === 'CASH' ? cashSessionId : null,
            userId,
          }
        });

        if (dto.method === 'CASH') {
          await tx.cashMovement.create({
            data: {
              cashSessionId,
              type: 'OUT',
              amount: dto.amount,
              reason: `Reembolso devoluÃ§Ã£o ${saleReturn.returnNumber}`,
              userId,
            }
          });
        }

        await tx.auditLog.create({
          data: { pharmacyId, userId, action: 'sale.return.refund', entity: 'ReturnRefund', entityId: refund.id },
        });

        return refund;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.returnRefund.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
        if (existing) return existing;
      }
      throw error;
    }
  }

  async confirmRefund(pharmacyId: string, userId: string, refundId: string, dto: ConfirmRefundDto) {
    return this.prisma.$transaction(async (tx) => {
      const refunds = await tx.$queryRaw`
        SELECT * FROM "return_refunds" 
        WHERE id = ${refundId}::uuid 
        FOR UPDATE
      ` as Array<{ id: string; status: string }>;
      const refund = refunds[0];
      if (!refund) throw new NotFoundException('Reembolso nÃ£o encontrado.');
      if (refund.status !== 'PENDING') throw new BadRequestException('Apenas reembolsos pendentes podem ser confirmados.');

      const updated = await tx.returnRefund.update({
        where: { id: refundId },
        data: {
          status: dto.status,
          externalReference: dto.externalReference,
          notes: dto.notes,
          confirmedBy: userId,
          confirmedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'sale.return.refund.confirm', entity: 'ReturnRefund', entityId: refundId },
      });

      return updated;
    });
  }
}
