import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma } from '@prisma/client';
import { emitOutboxEvent } from '../sync/outbox.helper';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(pharmacyId: string, actorId: string, dto: CreateProductDto) {
    if (dto.categoryId) {
      const cat = await this.prisma.category.findFirst({ where: { id: dto.categoryId, pharmacyId } });
      if (!cat) throw new BadRequestException('Categoria inválida.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: { ...dto, pharmacyId }
        });
        await tx.auditLog.create({
          data: { pharmacyId, userId: actorId, action: 'product.create', entity: 'Product', entityId: product.id }
        });
        await emitOutboxEvent(tx, pharmacyId, 'PRODUCT', product.id, 'CREATED', product as any);
        return product;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('SKU ou Código de Barras já existe nesta farmácia.');
      }
      throw e;
    }
  }

  async findAll(
    pharmacyId: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
    categoryId?: string,
    status?: string,
  ) {
    const skip = (page - 1) * limit;
    
    const where: Prisma.ProductWhereInput = {
      pharmacyId,
      ...(status && { status: status as any }),
      ...(categoryId && { categoryId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
        ]
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where, skip, take: limit,
        include: { category: { select: { name: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(pharmacyId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, pharmacyId },
      include: { category: true },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    return product;
  }

  async delete(pharmacyId: string, actorId: string, id: string) {
    const product = await this.findOne(pharmacyId, id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: { status: 'INACTIVE' },
      });
      await tx.auditLog.create({
        data: { pharmacyId, userId: actorId, action: 'product.deactivate', entity: 'Product', entityId: id },
      });
      return updated;
    });
  }

  async update(pharmacyId: string, actorId: string, id: string, dto: UpdateProductDto) {
    const product = await this.findOne(pharmacyId, id);

    if (dto.categoryId) {
      const cat = await this.prisma.category.findFirst({ where: { id: dto.categoryId, pharmacyId } });
      if (!cat) throw new BadRequestException('Categoria inválida.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.product.update({
          where: { id },
          data: dto,
        });
        await tx.auditLog.create({
          data: { pharmacyId, userId: actorId, action: 'product.update', entity: 'Product', entityId: id }
        });
        await emitOutboxEvent(tx, pharmacyId, 'PRODUCT', updated.id, 'UPDATED', updated as any);
        return updated;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('SKU ou Código de Barras já existe nesta farmácia.');
      }
      throw e;
    }
  }
}
