import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ReportQueryDto, ExpenseReportQueryDto } from './dto/report-query.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('summary')
  @RequirePermissions(PERMISSIONS.REPORTS_READ)
  @ApiOperation({ summary: 'Resumo operacional do período' })
  getSummary(@Tenant() pharmacyId: string, @Query() query: ReportQueryDto) {
    return this.service.getSummary(pharmacyId, query);
  }

  @Get('sales')
  @RequirePermissions(PERMISSIONS.REPORTS_READ)
  @ApiOperation({ summary: 'Relatório de vendas' })
  getSales(@Tenant() pharmacyId: string, @Query() query: ReportQueryDto) {
    return this.service.getSalesReport(pharmacyId, query);
  }

  @Get('expenses')
  @RequirePermissions(PERMISSIONS.REPORTS_FINANCIAL)
  @ApiOperation({ summary: 'Relatório de despesas (financeiro)' })
  getExpenses(@Tenant() pharmacyId: string, @Query() query: ExpenseReportQueryDto) {
    return this.service.getExpensesReport(pharmacyId, query);
  }

  @Get('cash')
  @RequirePermissions(PERMISSIONS.REPORTS_READ)
  @ApiOperation({ summary: 'Relatório de caixa' })
  getCash(@Tenant() pharmacyId: string, @Query() query: ReportQueryDto) {
    return this.service.getCashReport(pharmacyId, query);
  }

  @Get('stock')
  @RequirePermissions(PERMISSIONS.REPORTS_READ)
  @ApiOperation({ summary: 'Relatório de stock' })
  getStock(@Tenant() pharmacyId: string, @Query() query: ReportQueryDto) {
    return this.service.getStockReport(pharmacyId, query);
  }
}