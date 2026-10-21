import { Module } from '@nestjs/common';
import { PharmacyRepository } from './pharmacy.repository';
import { PharmacyService } from './pharmacy.service';
import { PharmacyController } from './pharmacy.controller';

@Module({
  controllers: [PharmacyController],
  providers: [PharmacyRepository, PharmacyService],
  exports: [PharmacyService],
})
export class PharmacyModule {}