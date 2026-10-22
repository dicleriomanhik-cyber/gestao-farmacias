import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('expenses')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.EXPENSES_CREATE)
  @ApiOperation({ summary: 'Criar despesa (DRAFT)' })
  create(@Tenant() pharmacyId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateExpenseDto) {
    return this.service.create(pharmacyId, user.id, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.EXPENSES_READ)
  @ApiOperation({ summary: 'Listar despesas' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'method', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  findAll(
    @Tenant() pharmacyId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('method') method?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.findAll(pharmacyId, Number(page), Number(limit), search, category, method, status, startDate, endDate);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.EXPENSES_READ)
  @ApiOperation({ summary: 'Obter despesa' })
  findOne(@Tenant() pharmacyId: string, @Param('id') id: string) {
    return this.service.findOne(pharmacyId, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.EXPENSES_CREATE)
  @ApiOperation({ summary: 'Actualizar despesa (apenas DRAFT)' })
  update(
    @Tenant() pharmacyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.service.update(pharmacyId, user.id, id, dto);
  }

  @Patch(':id/cancel')
  @RequirePermissions(PERMISSIONS.EXPENSES_CANCEL)
  @ApiOperation({ summary: 'Cancelar despesa (apenas DRAFT)' })
  cancel(@Tenant() pharmacyId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.cancel(pharmacyId, user.id, id);
  }

  @Patch(':id/confirm')
  @RequirePermissions(PERMISSIONS.EXPENSES_CONFIRM)
  @ApiOperation({ summary: 'Confirmar despesa (aplica movimento de caixa se CASH)' })
  confirm(@Tenant() pharmacyId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.confirm(pharmacyId, user.id, id);
  }
}