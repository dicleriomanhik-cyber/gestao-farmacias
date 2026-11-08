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

  private stripRef<T>(v: T, permissions?: string[]): T {
    if (!permissions || permissions.includes('pharmacy:config:write')) return v;
    const f = (x: any): any =>
      Array.isArray(x)
        ? x.map(f)
        : x && typeof x === 'object'
          ? typeof x.toJSON === 'function'
            ? x
            : Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'referenceCost' && k !== 'unitCost').map(([k, y]) => [k, f(y)]))
          : x;
    return f(v);
  }

  async create(pharmacyId: string, userId: string, dto: CreateReturnDto, outerTx?: Prisma.TransactionClient) {
    const run = async (tx: Prisma.TransactionClient) => {
      const sale = await tx.sale.findFirst({
        where: { id: dto.saleId, pharmacyId },
        include: { lines: true },
      });
      if (!sale) throw new NotFoundException('Venda não encontrada.');
      if (sale.status !== 'CONFIRMED') throw new BadRequestException('Apenas vendas confirmadas podem ser devolvidas.');

      let totalRefund = new Decimal(0);
      const linesData = [];

      for (const lineDto of dto.lines) {
        const saleLine = sale.lines.find(l => l.id === lineDto.saleLineId);
        if (!saleLine) throw new BadRequestException(`Linha de venda ${lineDto.saleLineId} não encontrada.`);

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

      let operatorFields: { operatorId?: string; operatorName?: string } = {};
      if (dto.operatorId) {
        const op = await tx.pharmacyOperator.findFirst({ where: { id: dto.operatorId, pharmacyId }, select: { id: true, name: true } });
        if (op) operatorFields = { operatorId: op.id, operatorName: op.name };
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
          ...operatorFields,
          lines: { create: linesData },
        },
        include: { lines: true },
      });
    };
    return outerTx ? run(outerTx) : this.prisma.$transaction(run);
  }

  async findAll(pharmacyId: string, page: number = 1, limit: number = 20, permissions?: string[]) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.saleReturn.findMany({
        where: { pharmacyId },
        skip, take: limit,
        include: { lines: { include: { product: true, refunds: true } }, sale: { select: { saleNumber: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.saleReturn.count({ where: { pharmacyId } }),
    ]);
    return { data: this.stripRef(data, permissions), meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(pharmacyId: string, id: string, permissions?: string[]) {
    const ret = await this.prisma.saleReturn.findFirst({
      where: { id, pharmacyId },
      include: { lines: { include: { product: true, refunds: true } }, sale: { select: { saleNumber: true } } },
    });
    if (!ret) throw new NotFoundException('Devolução não encontrada.');
    return this.stripRef(ret, permissions);
  }

  async listQuarantine(pharmacyId: string, page: number = 1, limit: number = 20, permissions?: string[]) {
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
    return { data: this.stripRef(data, permissions), meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async confirm(pharmacyId: string, userId: string, returnId: string, outerTx?: Prisma.TransactionClient) {
    const run = async (tx: Prisma.TransactionClient) => {
      const returns = await tx.$queryRaw`
        SELECT * FROM "sale_returns" 
        WHERE id = ${returnId}::uuid AND "pharmacyId" = ${pharmacyId}::uuid 
        FOR UPDATE
      ` as Array<{ id: string; saleId: string; status: string }>;
      const saleReturn = returns[0];
      if (!saleReturn) throw new NotFoundException('Devolução não encontrada.');
      if (saleReturn.status !== 'DRAFT') throw new BadRequestException('Apenas rascunhos podem ser confirmados.');

      await tx.$queryRaw`SELECT id FROM "sales" WHERE id = ${saleReturn.saleId}::uuid FOR UPDATE`;

      const lines = await tx.saleReturnLine.findMany({ where: { returnId } });
      
      for (const line of lines) {
        const jaDevolvido = (await tx.saleReturnLine.aggregate({
          where: { saleLineId: line.saleLineId, id: { not: line.id }, return: { status: 'CONFIRMED' } },
          _sum: { quantity: true },
        }))._sum.quantity || 0;
        let saltar = jaDevolvido;
        let restante = line.quantity;
        const vendidos = await tx.saleLineLot.findMany({ where: { saleLineId: line.saleLineId }, orderBy: { id: 'asc' } });
        const destinos: Array<{ lotId: string | null; qty: number }> = [];
        for (const v of vendidos) {
          if (restante <= 0) break;
          let disponivel = v.quantity;
          if (saltar > 0) { const s = Math.min(saltar, disponivel); saltar -= s; disponivel -= s; }
          const dar = Math.min(restante, disponivel);
          if (dar > 0) { destinos.push({ lotId: v.lotId, qty: dar }); restante -= dar; }
        }
        if (restante > 0) {
          const ultimo = await tx.stockLot.findFirst({ where: { pharmacyId, productId: line.productId }, orderBy: { createdAt: 'desc' } });
          destinos.push({ lotId: ultimo ? ultimo.id : null, qty: restante });
        }
        for (const d of destinos) {
          if (d.lotId) await tx.stockLot.update({ where: { id: d.lotId }, data: { quantityAvailable: { increment: d.qty } } });
          await tx.stockMovement.create({
            data: {
              pharmacyId,
              productId: line.productId,
              lotId: d.lotId,
              type: 'SALE_RETURN',
              quantity: d.qty,
              referenceId: returnId,
              referenceType: 'SaleReturn',
              userId,
              notes: 'Stock reposto pela devolucao',
            }
          });
        }
      }

      const updated = await tx.saleReturn.update({
        where: { id: returnId },
        data: { status: 'CONFIRMED' },
      });

      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'sale.return.confirm', entity: 'SaleReturn', entityId: returnId },
      });

      return updated;
    };
    return outerTx ? run(outerTx) : this.prisma.$transaction(run);
  }

  async cancel(pharmacyId: string, userId: string, returnId: string, outerTx?: Prisma.TransactionClient) {
    const run = async (tx: Prisma.TransactionClient) => {
      const saleReturn = await tx.saleReturn.findFirst({ where: { id: returnId, pharmacyId } });
      if (!saleReturn) throw new NotFoundException('Devolução não encontrada.');
      if (saleReturn.status !== 'CONFIRMED') throw new BadRequestException('Apenas devoluções confirmadas podem ser canceladas.');

      const lineIds = (await tx.saleReturnLine.findMany({ where: { returnId }, select: { id: true } })).map((l) => l.id);
      const quarantines = await tx.quarantineStock.findMany({ where: { saleReturnLineId: { in: lineIds } } });
      if (quarantines.some((q) => q.quantityInspected > 0)) {
        throw new BadRequestException('Não é possível cancelar: a devolução já foi inspecionada.');
      }
      const reembolsos = await tx.returnRefund.count({
        where: { returnLineId: { in: lineIds }, status: { in: ['PENDING', 'COMPLETED'] } },
      });
      if (reembolsos > 0) throw new BadRequestException('Não é possível cancelar: já existem reembolsos registados.');

      const repostos = await tx.stockMovement.findMany({ where: { referenceType: 'SaleReturn', referenceId: returnId, type: 'SALE_RETURN', lotId: { not: null } } });
      for (const m of repostos) {
        const lote = await tx.stockLot.findUnique({ where: { id: m.lotId as string } });
        if (!lote) continue;
        await tx.stockLot.update({ where: { id: lote.id }, data: { quantityAvailable: Math.max(0, lote.quantityAvailable - m.quantity) } });
      }
      await tx.quarantineStock.deleteMany({ where: { saleReturnLineId: { in: lineIds } } });
      await tx.stockMovement.deleteMany({ where: { referenceType: 'SaleReturn', referenceId: returnId, type: 'SALE_RETURN' } });
      await tx.saleReturn.update({ where: { id: returnId }, data: { status: 'CANCELLED' } });
      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'sale.return.cancel', entity: 'SaleReturn', entityId: returnId },
      });
      return { id: returnId, status: 'CANCELLED' };
    };
    return outerTx ? run(outerTx) : this.prisma.$transaction(run);
  }
  async inspectAndRelease(pharmacyId: string, userId: string, returnId: string, lineId: string, dto: InspectReturnDto) {
    return this.prisma.$transaction(async (tx) => {
      const quarantines = await tx.$queryRaw`
        SELECT * FROM "quarantine_stock" 
        WHERE "saleReturnLineId" = ${lineId}::uuid AND "pharmacyId" = ${pharmacyId}::uuid 
        FOR UPDATE
      ` as Array<{ id: string; productId: string; lotNumber: string; expiryDate: Date; quantityReceived: number; quantityInspected: number; unitCost: Decimal }>;
      const q = quarantines[0];
      if (!q) throw new NotFoundException('Registo de quarentena não encontrado.');
      
      const availableToInspect = q.quantityReceived - q.quantityInspected;
      if (dto.quantityToRelease > availableToInspect) {
        throw new BadRequestException('Quantidade superior ao disponível para inspeção.');
      }

      if (dto.condition === 'RESELLABLE') {
        if (q.lotNumber === 'DESCONHECIDO' || !q.expiryDate) {
          throw new BadRequestException('Não é possível libertar artigo sem lote e validade verificáveis.');
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
              quantityReceived: dto.quantityToRelease, totalUnits: dto.quantityToRelease,
              quantityAvailable: dto.quantityToRelease,
              unitCost: q.unitCost,
              status: 'ACTIVE',
            }
          });
        } else {
          await tx.stockLot.update({
            where: { id: lot.id },
            data: { 
              quantityReceived: { increment: dto.quantityToRelease }, totalUnits: { increment: dto.quantityToRelease },
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
        if (!saleReturn) throw new NotFoundException('Devolução não encontrada.');
        if (saleReturn.status !== 'CONFIRMED') throw new BadRequestException('Devolução não confirmada.');

        const returnLine = await tx.saleReturnLine.findFirst({
          where: { id: dto.returnLineId, returnId: saleReturn.id },
        });
        if (!returnLine) throw new BadRequestException('Linha de devolução não encontrada.');

        const salePayment = await tx.salePayment.findFirst({
          where: { id: dto.salePaymentId, saleId: saleReturn.saleId },
        });
        if (!salePayment) throw new BadRequestException('Pagamento original não encontrado.');

        if (salePayment.method !== dto.method) {
          throw new BadRequestException(`Método de reembolso (${dto.method}) não coincide com o pagamento original (${salePayment.method}).`);
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
          throw new BadRequestException(`Valor excede o saldo reembolsável (${eligibleAmount.toFixed(2)}).`);
        }

        let cashSessionId = dto.cashSessionId;
        if (!cashSessionId) throw new BadRequestException('Sessão de caixa obrigatória para reembolso.');
        const session = await tx.cashSession.findFirst({ where: { id: cashSessionId, pharmacyId, status: 'OPEN' } });
        if (!session) throw new BadRequestException('Sessão de caixa inválida ou fechada.');
        const status = 'COMPLETED' as const;

        const refund = await tx.returnRefund.create({
          data: {
            returnLineId: returnLine.id,
            salePaymentId: salePayment.id,
            method: dto.method,
            status,
            amount: dto.amount,
            idempotencyKey: dto.idempotencyKey,
            cashSessionId,
            userId,
          }
        });

        await tx.cashMovement.create({
          data: {
            cashSessionId,
            type: 'OUT',
            method: dto.method,
            amount: dto.amount,
            reason: `Reembolso devolução ${saleReturn.returnNumber}`,
            userId,
          }
        });

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
      if (!refund) throw new NotFoundException('Reembolso não encontrado.');
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


