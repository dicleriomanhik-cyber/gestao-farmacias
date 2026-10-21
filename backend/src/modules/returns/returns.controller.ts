// @ts-nocheck
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { InspectReturnDto } from './dto/inspect-return.dto';
import { RefundDto } from './dto/refund.dto';
import { ConfirmRefundDto } from './dto/confirm-refund.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('returns')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('returns')
export class ReturnsController {
  constructor(private readonly service: ReturnsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.RETURNS_CREATE)
  @ApiOperation({ summary: 'Criar devolução (DRAFT)' })
  create(@Tenant() pharmacyId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReturnDto) {
    return this.service.create(pharmacyId, user.id, dto);
  }

  @Get('quarantine')
  @RequirePermissions(PERMISSIONS.RETURNS_READ)
  @ApiOperation({ summary: 'Listar artigos em quarentena' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  listQuarantine(
    @Tenant() pharmacyId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.service.listQuarantine(pharmacyId, Number(page), Number(limit));
  }

  @Patch(':id/confirm')
  @RequirePermissions(PERMISSIONS.RETURNS_CONFIRM)
  @ApiOperation({ summary: 'Confirmar devolução' })
  confirm(@Tenant() pharmacyId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.confirm(pharmacyId, user.id, id);
  }

  @Patch(':id/lines/:lineId/inspect')
  @RequirePermissions(PERMISSIONS.RETURNS_INSPECT)
  @ApiOperation({ summary: 'Inspecionar e libertar artigo da quarentena' })
  inspect(
    @Tenant() pharmacyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body() dto: InspectReturnDto,
  ) {
    return this.service.inspectAndRelease(pharmacyId, user.id, id, lineId, dto);
  }

  @Post(':id/refund')
  @RequirePermissions(PERMISSIONS.RETURNS_REFUND)
  @ApiOperation({ summary: 'Registar reembolso' })
  refund(
    @Tenant() pharmacyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RefundDto,
  ) {
    return this.service.refund(pharmacyId, user.id, id, dto);
  }

  @Patch('refunds/:refundId/confirm')
  @RequirePermissions(PERMISSIONS.RETURNS_REFUND)
  @ApiOperation({ summary: 'Confirmar manualmente reembolso digital' })
  confirmRefund(
    @Tenant() pharmacyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('refundId') refundId: string,
    @Body() dto: ConfirmRefundDto,
  ) {
    return this.service.confirmRefund(pharmacyId, user.id, refundId, dto);
  }
}