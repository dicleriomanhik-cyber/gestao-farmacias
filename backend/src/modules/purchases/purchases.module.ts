import { Module } from '@nestjs/common';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { SupplierPaymentsController } from './supplier-payments.controller';
import { SupplierPaymentsService } from './supplier-payments.service';

@Module({
  controllers: [PurchasesController, SupplierPaymentsController],
  providers: [PurchasesService, SupplierPaymentsService],
  exports: [PurchasesService, SupplierPaymentsService],
})
export class PurchasesModule {}