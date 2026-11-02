import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SupplierPaymentsService } from './supplier-payments.service';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('supplier-payments')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('supplier-payments')
export class SupplierPaymentsController {
  constructor(private readonly service: SupplierPaymentsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.PHARMACY_CONFIG_WRITE)
  @ApiOperation({ summary: 'Registar pagamento a fornecedor' })
  create(@Tenant() pharmacyId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSupplierPaymentDto) {
    return this.service.pay(pharmacyId, user.id, dto);
  }

  @Get('payables')
  @RequirePermissions(PERMISSIONS.PHARMACY_CONFIG_WRITE)
  @ApiOperation({ summary: 'Contas a pagar por fornecedor' })
  payables(@Tenant() pharmacyId: string) {
    return this.service.payables(pharmacyId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PHARMACY_CONFIG_WRITE)
  @ApiOperation({ summary: 'Listar pagamentos a fornecedores' })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'purchaseId', required: false })
  list(@Tenant() pharmacyId: string, @Query('supplierId') supplierId?: string, @Query('purchaseId') purchaseId?: string) {
    return this.service.listPayments(pharmacyId, supplierId, purchaseId);
  }
}