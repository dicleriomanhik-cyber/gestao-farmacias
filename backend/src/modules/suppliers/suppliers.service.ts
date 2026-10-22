import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(pharmacyId: string, actorId: string, dto: CreateSupplierDto) {
    return this.prisma.$transaction(async (tx) => {
      // Separa explicitamente os campos para evitar conflito entre CreateInput/UncheckedCreateInput
      const { name, taxId, phone, email, address, city, province, notes, status } = dto;
      const supplier = await tx.supplier.create({
        data: {
          name,
          taxId,
          phone,
          email,
          address,
          city,
          province,
          notes,
          status,
          pharmacy: { connect: { id: pharmacyId } },
        },
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

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(pharmacyId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, pharmacyId } });
    if (!supplier) throw new NotFoundException('Fornecedor não encontrado.');
    return supplier;
  }

  async update(pharmacyId: string, actorId: string, id: string, dto: UpdateSupplierDto) {
    await this.findOne(pharmacyId, id);
    return this.prisma.$transaction(async (tx) => {
      const { name, taxId, phone, email, address, city, province, notes, status } = dto;
      const updated = await tx.supplier.update({
        where: { id },
        data: { name, taxId, phone, email, address, city, province, notes, status },
      });
      await tx.auditLog.create({
        data: { pharmacyId, userId: actorId, action: 'supplier.update', entity: 'Supplier', entityId: id },
      });
      return updated;
    });
  }
}