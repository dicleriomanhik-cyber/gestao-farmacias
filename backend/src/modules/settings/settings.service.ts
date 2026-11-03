// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async get(pharmacyId: string) {
    return this.prisma.pharmacySettings.upsert({
      where: { pharmacyId },
      update: {},
      create: { pharmacyId },
    });
  }

  async update(pharmacyId: string, actorId: string, dto: UpdateSettingsDto) {
    await this.get(pharmacyId);
    const data: any = { ...dto };
    if (dto.vatRegime !== undefined) {
      data.vatRegime = dto.vatRegime && String(dto.vatRegime).trim() ? String(dto.vatRegime).trim() : null;
    }
    const updated = await this.prisma.pharmacySettings.update({ where: { pharmacyId }, data });
    await this.prisma.auditLog.create({
      data: {
        pharmacyId,
        userId: actorId,
        action: 'settings.update',
        entity: 'PharmacySettings',
        entityId: updated.id,
        metadata: { fields: Object.keys(dto) },
      },
    });
    return updated;
  }
}