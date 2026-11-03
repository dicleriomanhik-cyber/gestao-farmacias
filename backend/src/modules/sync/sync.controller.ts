// @ts-nocheck
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { SyncQueryService } from './sync-query.service';
import { SyncPushDto } from './dto/sync-push.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('sync')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly service: SyncService, private readonly query: SyncQueryService) {}

  @Post('push')
  @RequirePermissions(PERMISSIONS.SALES_CREATE)
  @ApiOperation({ summary: 'Enviar operações offline (vendas e pagamentos)' })
  push(@Tenant() pharmacyId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: SyncPushDto) {
    return this.service.push(pharmacyId, user.id, dto.clientId, dto.operations, user.permissions ?? []);
  }

  @Get('pull')
  @RequirePermissions(PERMISSIONS.SALES_CREATE)
  @ApiOperation({ summary: 'Snapshot de produtos e stock para o POS' })
  pull(@Tenant() pharmacyId: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.service.pull(pharmacyId, cursor, limit ? Number(limit) : 100);
  }

  @Get('operations')
  @RequirePermissions(PERMISSIONS.SALES_READ)
  @ApiOperation({ summary: 'Listar operações sincronizadas, com filtro por estado' })
  listOperations(@Tenant() pharmacyId: string, @Query('status') status?: string, @Query('limit') limit?: string) {
    return this.query.listOperations(pharmacyId, status, Number(limit ?? 50));
  }

  @Get('operations/:key')
  @RequirePermissions(PERMISSIONS.SALES_CREATE)
  @ApiOperation({ summary: 'Estado de uma operação enviada' })
  findOperation(@Tenant() pharmacyId: string, @Param('key') key: string) {
    return this.service.findOperation(pharmacyId, key);
  }
}
