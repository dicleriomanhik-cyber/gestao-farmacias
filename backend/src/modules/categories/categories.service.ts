// @ts-nocheck
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(pharmacyId: string, dto: CreateCategoryDto) {
    const exists = await this.prisma.category.findFirst({ where: { pharmacyId, name: dto.name } });
    if (exists) throw new ConflictException('Categoria já existe.');
    return this.prisma.category.create({ data: { ...dto, pharmacyId } });
  }

  async findAll(pharmacyId: string) {
    return this.prisma.category.findMany({ where: { pharmacyId }, orderBy: { name: 'asc' } });
  }

  async update(pharmacyId: string, id: string, dto: UpdateCategoryDto) {
    const cat = await this.prisma.category.findFirst({ where: { id, pharmacyId } });
    if (!cat) throw new NotFoundException('Categoria não encontrada.');
    return this.prisma.category.update({ where: { id }, data: dto });
  }
}
