import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { SalesModule } from '../sales/sales.module';
import { CashModule } from '../cash/cash.module';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule, SalesModule, CashModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}