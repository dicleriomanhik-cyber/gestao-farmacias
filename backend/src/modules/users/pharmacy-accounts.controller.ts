import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PharmacyAccountsService } from './pharmacy-accounts.service';
import { CreatePharmacyAccountDto, UpdatePharmacyAccountDto } from './dto/pharmacy-account.dto';
import { CreateOperatorDto } from '../operators/dto/create-operator.dto';
import { UpdateOperatorDto } from '../operators/dto/update-operator.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('pharmacy-accounts')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('pharmacy-accounts')
export class PharmacyAccountsController {
  constructor(private readonly service: PharmacyAccountsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'Listar farmácias registadas por esta farmácia' })
  list(@Tenant() ownerId: string) {
    return this.service.list(ownerId);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'Detalhe de uma farmácia registada' })
  get(@Tenant() ownerId: string, @Param('id') id: string) {
    return this.service.get(ownerId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USERS_WRITE)
  @ApiOperation({ summary: 'Registar nova farmácia com colaboradores e conta de acesso' })
  create(@Tenant() ownerId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePharmacyAccountDto) {
    return this.service.create(ownerId, user.id, dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.USERS_WRITE)
  @ApiOperation({ summary: 'Alterar nome, password ou estado da farmácia' })
  update(
    @Tenant() ownerId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePharmacyAccountDto,
  ) {
    return this.service.update(ownerId, user.id, id, dto);
  }

  @Post(':id/operators')
  @RequirePermissions(PERMISSIONS.USERS_WRITE)
  @ApiOperation({ summary: 'Adicionar colaborador à farmácia' })
  addOperator(
    @Tenant() ownerId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateOperatorDto,
  ) {
    return this.service.addOperator(ownerId, user.id, id, dto);
  }

  @Patch(':id/operators/:opId')
  @RequirePermissions(PERMISSIONS.USERS_WRITE)
  @ApiOperation({ summary: 'Renomear ou ativar/desativar colaborador da farmácia' })
  updateOperator(
    @Tenant() ownerId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('opId') opId: string,
    @Body() dto: UpdateOperatorDto,
  ) {
    return this.service.updateOperator(ownerId, user.id, id, opId, dto);
  }
}