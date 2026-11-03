// @ts-nocheck
import { Module } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { SupplierPaymentsModule } from '../supplier-payments/supplier-payments.module';

@Module({
  imports: [SupplierPaymentsModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}