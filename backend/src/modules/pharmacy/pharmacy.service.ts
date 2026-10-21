import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PharmacyRepository } from './pharmacy.repository';
import { UpdatePharmacyDto } from './dto/update-pharmacy.dto';

@Injectable()
export class PharmacyService {
  constructor(
    private readonly repo: PharmacyRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getPharmacy(pharmacyId: string) {
    const pharmacy = await this.repo.findById(pharmacyId);
    if (!pharmacy) throw new NotFoundException('Farmácia não encontrada.');
    return pharmacy;
  }

  async updatePharmacy(pharmacyId: string, actorId: string, dto: UpdatePharmacyDto) {
    // Apenas atualiza os campos enviados
    const updated = await this.repo.update(pharmacyId, dto);

    // Auditoria
    await this.prisma.auditLog.create({
      data: {
        pharmacyId,
        userId: actorId,
        action: 'pharmacy.update',
        entity: 'Pharmacy',
        entityId: pharmacyId,
        metadata: { fields: Object.keys(dto) },
      },
    });

    return updated;
  }
}