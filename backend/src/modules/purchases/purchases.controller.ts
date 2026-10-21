// @ts-nocheck
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('purchases')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly service: PurchasesService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.PURCHASES_WRITE)
  @ApiOperation({ summary: 'Criar compra (DRAFT)' })
  create(@Tenant() pharmacyId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePurchaseDto) {
    return this.service.create(pharmacyId, user.id, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PURCHASES_READ)
  @ApiOperation({ summary: 'Listar compras' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Tenant() pharmacyId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.service.findAll(pharmacyId, Number(page), Number(limit));
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PURCHASES_READ)
  @ApiOperation({ summary: 'Obter compra' })
  findOne(@Tenant() pharmacyId: string, @Param('id') id: string) {
    return this.service.findOne(pharmacyId, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PURCHASES_WRITE)
  @ApiOperation({ summary: 'Actualizar dados gerais da compra' })
  update(
    @Tenant() pharmacyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseDto,
  ) {
    return this.service.update(pharmacyId, user.id, id, dto);
  }

  @Patch(':id/confirm')
  @RequirePermissions(PERMISSIONS.PURCHASES_WRITE)
  @ApiOperation({ summary: 'Confirmar compra' })
  confirm(@Tenant() pharmacyId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.confirm(pharmacyId, user.id, id);
  }

  @Patch(':id/cancel')
  @RequirePermissions(PERMISSIONS.PURCHASES_WRITE)
  @ApiOperation({ summary: 'Cancelar compra' })
  cancel(@Tenant() pharmacyId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.cancel(pharmacyId, user.id, id);
  }
}