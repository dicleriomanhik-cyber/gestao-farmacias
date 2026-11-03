// @ts-nocheck
import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { SyncQueryService } from './sync-query.service';
import { SyncExtraService } from './sync-extra.service';
import { ExpensesModule } from '../expenses/expenses.module';
import { ReturnsModule } from '../returns/returns.module';
import { CashModule } from '../cash/cash.module';
import { CategoriesModule } from '../categories/categories.module';
import { ProductsModule } from '../products/products.module';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [ExpensesModule, ReturnsModule, CashModule, CategoriesModule, ProductsModule, StockModule],
  controllers: [SyncController],
  providers: [SyncService, SyncQueryService, SyncExtraService],
})
export class SyncModule {}