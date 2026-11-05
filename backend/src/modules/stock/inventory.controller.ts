import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto, SaveInventoryCountsDto } from './dto/inventory.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('stock')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('stock/inventories')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.STOCK_READ)
  @ApiOperation({ summary: 'Listar inventários' })
  list(@Tenant() pharmacyId: string) {
    return this.service.list(pharmacyId);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.STOCK_READ)
  @ApiOperation({ summary: 'Detalhe do inventário com linhas por caixa' })
  get(@Tenant() pharmacyId: string, @Param('id') id: string) {
    return this.service.get(pharmacyId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.STOCK_ADJUST)
  @ApiOperation({ summary: 'Abrir inventário (fotografia do stock actual)' })
  create(@Tenant() pharmacyId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInventoryDto) {
    return this.service.create(pharmacyId, user.id, dto);
  }

  @Patch(':id/counts')
  @RequirePermissions(PERMISSIONS.STOCK_ADJUST)
  @ApiOperation({ summary: 'Gravar quantidades contadas' })
  saveCounts(@Tenant() pharmacyId: string, @Param('id') id: string, @Body() dto: SaveInventoryCountsDto) {
    return this.service.saveCounts(pharmacyId, id, dto);
  }

  @Post(':id/complete')
  @RequirePermissions(PERMISSIONS.STOCK_ADJUST)
  @ApiOperation({ summary: 'Concluir inventário e aplicar diferenças ao stock' })
  complete(@Tenant() pharmacyId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.complete(pharmacyId, user.id, id);
  }

  @Post(':id/cancel')
  @RequirePermissions(PERMISSIONS.STOCK_ADJUST)
  @ApiOperation({ summary: 'Cancelar inventário aberto' })
  cancel(@Tenant() pharmacyId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.cancel(pharmacyId, user.id, id);
  }
}