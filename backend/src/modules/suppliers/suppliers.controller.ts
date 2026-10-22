import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('suppliers')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.SUPPLIERS_WRITE)
  @ApiOperation({ summary: 'Criar fornecedor' })
  create(@Tenant() pharmacyId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSupplierDto) {
    return this.service.create(pharmacyId, user.id, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.SUPPLIERS_READ)
  @ApiOperation({ summary: 'Listar fornecedores' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Tenant() pharmacyId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
  ) {
    return this.service.findAll(pharmacyId, Number(page), Number(limit), search);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SUPPLIERS_READ)
  @ApiOperation({ summary: 'Obter fornecedor' })
  findOne(@Tenant() pharmacyId: string, @Param('id') id: string) {
    return this.service.findOne(pharmacyId, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SUPPLIERS_WRITE)
  @ApiOperation({ summary: 'Actualizar fornecedor' })
  update(
    @Tenant() pharmacyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.service.update(pharmacyId, user.id, id, dto);
  }
}