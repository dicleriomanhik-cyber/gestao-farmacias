import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { SalesModule } from '../sales/sales.module';
import { CashModule } from '../cash/cash.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { ReturnsModule } from '../returns/returns.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { PurchasesModule } from '../purchases/purchases.module';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule, SalesModule, CashModule, ExpensesModule, ReturnsModule, SuppliersModule, PurchasesModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}