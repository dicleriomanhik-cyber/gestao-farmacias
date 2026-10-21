// @ts-nocheck
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { ReceiveStockDto } from './dto/receive-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('stock')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly service: StockService) {}

  @Post('receive')
  @RequirePermissions(PERMISSIONS.STOCK_WRITE)
  @ApiOperation({ summary: 'Receber mercadoria (criar lote e dar entrada)' })
  receive(@Tenant() pharmacyId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: ReceiveStockDto) {
    return this.service.receiveStock(pharmacyId, user.id, dto);
  }

  @Post('adjust')
  @RequirePermissions(PERMISSIONS.STOCK_ADJUST)
  @ApiOperation({ summary: 'Ajustar stock de um lote' })
  adjust(@Tenant() pharmacyId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: AdjustStockDto) {
    return this.service.adjustStock(pharmacyId, user.id, dto);
  }

  @Get('lots')
  @RequirePermissions(PERMISSIONS.STOCK_READ)
  @ApiOperation({ summary: 'Consultar lotes (ordem FEFO)' })
  @ApiQuery({ name: 'productId', required: false })
  getLots(@Tenant() pharmacyId: string, @Query('productId') productId?: string) {
    return this.service.getLots(pharmacyId, productId);
  }

  @Get('movements')
  @RequirePermissions(PERMISSIONS.STOCK_READ)
  @ApiOperation({ summary: 'Consultar movimentos de stock' })
  @ApiQuery({ name: 'productId', required: false })
  getMovements(@Tenant() pharmacyId: string, @Query('productId') productId?: string) {
    return this.service.getMovements(pharmacyId, productId);
  }
}