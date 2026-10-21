import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PharmacyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.pharmacy.findUnique({
      where: { id },
      select: {
        id: true, name: true, tradeName: true, legalName: true, nif: true,
        phone: true, email: true, address: true, city: true, province: true,
        status: true, createdAt: true, updatedAt: true,
      }
    });
  }

  async update(id: string, data: any) {
    return this.prisma.pharmacy.update({
      where: { id },
      data,
      select: {
        id: true, name: true, tradeName: true, legalName: true, nif: true,
        phone: true, email: true, address: true, city: true, province: true,
        status: true, updatedAt: true,
      }
    });
  }
}