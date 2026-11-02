import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async get(pharmacyId: string, tx?: Prisma.TransactionClient) {
    const db: Prisma.TransactionClient = tx ?? this.prisma;
    return db.pharmacySettings.upsert({ where: { pharmacyId }, update: {}, create: { pharmacyId } });
  }

  async update(pharmacyId: string, userId: string, dto: UpdateSettingsDto) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.pharmacySettings.upsert({
        where: { pharmacyId },
        update: { ...dto },
        create: { pharmacyId, ...dto },
      });
      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'settings.update', entity: 'PharmacySettings', entityId: updated.id },
      });
      return updated;
    });
  }
}