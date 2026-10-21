// @ts-nocheck
import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CashService } from './cash.service';
import { OpenCashDto } from './dto/open-cash.dto';
import { CloseCashDto } from './dto/close-cash.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('cash')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('cash')
export class CashController {
  constructor(private readonly service: CashService) {}

  @Post('open')
  @RequirePermissions(PERMISSIONS.CASH_OPEN)
  @ApiOperation({ summary: 'Abrir sessão de caixa' })
  open(@Tenant() pharmacyId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: OpenCashDto) {
    return this.service.openCash(pharmacyId, user.id, dto);
  }

  @Patch(':id/close')
  @RequirePermissions(PERMISSIONS.CASH_CLOSE)
  @ApiOperation({ summary: 'Fechar sessão de caixa' })
  close(
    @Tenant() pharmacyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CloseCashDto,
  ) {
    return this.service.closeCash(pharmacyId, user.id, id, dto);
  }

  @Get('active')
  @RequirePermissions(PERMISSIONS.CASH_OPEN)
  @ApiOperation({ summary: 'Obter sessão de caixa aberta' })
  getActive(@Tenant() pharmacyId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getActiveSession(pharmacyId, user.id);
  }

  @Post('payments')
  @RequirePermissions(PERMISSIONS.CASH_OPEN)
  @ApiOperation({ summary: 'Registar pagamento de venda' })
  createPayment(@Tenant() pharmacyId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePaymentDto) {
    return this.service.createPayment(pharmacyId, user.id, dto);
  }

  @Post('movements')
  @RequirePermissions(PERMISSIONS.CASH_OPEN)
  @ApiOperation({ summary: 'Registar movimento manual de caixa (entrada/saída)' })
  createMovement(@Tenant() pharmacyId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCashMovementDto) {
    return this.service.createMovement(pharmacyId, user.id, dto);
  }
}