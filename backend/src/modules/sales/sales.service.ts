// @ts-nocheck
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(pharmacyId: string, userId: string, dto: CreateSaleDto) {
    // 1. Validar Produtos e obter preços atuais
    const productIds = dto.lines.map(l => l.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, pharmacyId, status: 'ACTIVE' },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException('Um ou mais produtos são inválidos ou inativos.');
    }

    // 2. Calcular Totais (Backend)
    let subtotal = new Decimal(0);
    let discountTotal = new Decimal(0);
    const linesData = dto.lines.map(line => {
      const product = products.find(p => p.id === line.productId);
      const unitPrice = product.salePrice;
      const discount = new Decimal(line.discount || 0);
      const lineSubtotal = unitPrice.mul(line.quantity).minus(discount);
      
      if (lineSubtotal.isNegative()) throw new BadRequestException('Desconto superior ao valor da linha.');

      subtotal = subtotal.add(lineSubtotal);
      discountTotal = discountTotal.add(discount);

      return {
        productId: line.productId,
        quantity: line.quantity,
        unitPrice,
        discount,
        subtotal: lineSubtotal,
      };
    });

    const total = subtotal;

    // 3. Criar Venda (DRAFT)
    const count = await this.prisma.sale.count({ where: { pharmacyId } });
    const saleNumber = `VND-${String(count + 1).padStart(6, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          pharmacyId,
          userId,
          saleNumber,
          status: 'DRAFT',
          subtotal,
          discount: discountTotal,
          total,
          notes: dto.notes,
          lines: {
            create: linesData,
          },
        },
        include: { lines: true },
      });

      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'sale.create', entity: 'Sale', entityId: sale.id },
      });

      return sale;
    });
  }

  async findAll(pharmacyId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.sale.findMany({
        where: { pharmacyId },
        skip, take: limit,
        include: { user: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sale.count({ where: { pharmacyId } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(pharmacyId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, pharmacyId },
      include: { lines: { include: { product: true, lots: true } }, user: true },
    });
    if (!sale) throw new NotFoundException('Venda não encontrada.');
    return sale;
  }

  async update(pharmacyId: string, userId: string, id: string, dto: UpdateSaleDto) {
    const sale = await this.findOne(pharmacyId, id);
    if (sale.status !== 'DRAFT') throw new BadRequestException('Apenas vendas em rascunho podem ser editadas.');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.sale.update({ where: { id }, data: { notes: dto.notes } });
      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'sale.update', entity: 'Sale', entityId: id },
      });
      return updated;
    });
  }

  async confirm(pharmacyId: string, userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Bloquear Venda (FOR UPDATE) para dupla confirmação
      const sales = await tx.$queryRaw`
        SELECT id, status FROM "sales" 
        WHERE id = ${id}::uuid AND "pharmacyId" = ${pharmacyId}::uuid 
        FOR UPDATE
      `;
      const sale = sales[0];
      if (!sale) throw new NotFoundException('Venda não encontrada.');
      if (sale.status !== 'DRAFT') throw new BadRequestException('Apenas rascunhos podem ser confirmados.');

      const saleLines = await tx.saleLine.findMany({ where: { saleId: id } });

      // 2. Processar FEFO e Stock para cada linha
      for (const line of saleLines) {
        let remainingQty = line.quantity;

        // Obter lotes elegíveis ordenados por validade (FEFO) e bloquear
        const lots = await tx.$queryRaw`
          SELECT id, "quantityAvailable", "expiryDate" 
          FROM "stock_lots" 
          WHERE "productId" = ${line.productId}::uuid 
            AND "pharmacyId" = ${pharmacyId}::uuid 
            AND "quantityAvailable" > 0 
            AND "expiryDate" > NOW() 
            AND status = 'ACTIVE'
          ORDER BY "expiryDate" ASC
          FOR UPDATE
        `;

        if (lots.length === 0) throw new BadRequestException(`Sem stock válido para o produto ${line.productId}.`);

        for (const lot of lots) {
          if (remainingQty <= 0) break;

          const consume = Math.min(remainingQty, lot.quantityAvailable);
          
          // Atualizar Lote
          await tx.stockLot.update({
            where: { id: lot.id },
            data: { quantityAvailable: { decrement: consume } },
          });

          // Registar Movimento
          await tx.stockMovement.create({
            data: {
              pharmacyId,
              productId: line.productId,
              lotId: lot.id,
              type: 'SALE',
              quantity: -consume, // Negativo
              referenceId: id,
              referenceType: 'Sale',
              userId,
            },
          });

          // Registar Rastreabilidade
          await tx.saleLineLot.create({
            data: { saleLineId: line.id, lotId: lot.id, quantity: consume },
          });

          remainingQty -= consume;
        }

        if (remainingQty > 0) {
          throw new BadRequestException(`Stock insuficiente para o produto ${line.productId}.`);
        }
      }

      // 3. Confirmar Venda
      const updated = await tx.sale.update({
        where: { id },
        data: { status: 'CONFIRMED' },
      });

      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'sale.confirm', entity: 'Sale', entityId: id },
      });

      return updated;
    });
  }
}