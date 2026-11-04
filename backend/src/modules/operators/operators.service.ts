import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';

@Injectable()
export class OperatorsService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive(pharmacyId: string) {
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { name: true, tradeName: true },
    });
    const operators = await this.prisma.pharmacyOperator.findMany({
      where: { pharmacyId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, isActive: true },
    });
    return { pharmacyName: pharmacy?.tradeName || pharmacy?.name || '', operators };
  }

  listAll(pharmacyId: string) {
    return this.prisma.pharmacyOperator.findMany({
      where: { pharmacyId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true, isActive: true, createdAt: true },
    });
  }

  async create(pharmacyId: string, userId: string, dto: CreateOperatorDto) {
    const name = dto.name.trim();
    if (name.length < 2) throw new BadRequestException('O nome deve ter pelo menos 2 caracteres.');
    const dup = await this.prisma.pharmacyOperator.findFirst({
      where: { pharmacyId, isActive: true, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (dup) throw new ConflictException('Já existe um colaborador com este nome.');
    const op = await this.prisma.pharmacyOperator.create({
      data: { pharmacyId, name },
      select: { id: true, name: true, isActive: true },
    });
    await this.prisma.auditLog.create({
      data: { pharmacyId, userId, action: 'operator.create', entity: 'PharmacyOperator', entityId: op.id },
    });
    return op;
  }

  async update(pharmacyId: string, userId: string, id: string, dto: UpdateOperatorDto) {
    const current = await this.prisma.pharmacyOperator.findFirst({ where: { id, pharmacyId } });
    if (!current) throw new NotFoundException('Colaborador não encontrado.');
    const data: { name?: string; isActive?: boolean } = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name.length < 2) throw new BadRequestException('O nome deve ter pelo menos 2 caracteres.');
      const dup = await this.prisma.pharmacyOperator.findFirst({
        where: { pharmacyId, isActive: true, id: { not: id }, name: { equals: name, mode: 'insensitive' } },
        select: { id: true },
      });
      if (dup) throw new ConflictException('Já existe um colaborador com este nome.');
      data.name = name;
    }
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    const op = await this.prisma.pharmacyOperator.update({
      where: { id },
      data,
      select: { id: true, name: true, isActive: true },
    });
    await this.prisma.auditLog.create({
      data: { pharmacyId, userId, action: 'operator.update', entity: 'PharmacyOperator', entityId: id },
    });
    return op;
  }
}