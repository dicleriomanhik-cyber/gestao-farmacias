import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  controllers: [StockController, InventoryController],
  providers: [StockService, InventoryService],
  exports: [StockService, InventoryService],
})
export class StockModule {}