import { BadRequestException, Body, Controller, Post, Get, Query, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { SyncPushDto } from './dto/sync-push.dto';
import { SyncPullDto } from './dto/sync-pull.dto';
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
  constructor(private readonly service: SyncService) {}

  @Get('pull')
  @RequirePermissions(PERMISSIONS.SYNC_PULL)
  @ApiOperation({ summary: 'Obter alteracoes para sincronizacao offline' })
  pull(@Tenant() pharmacyId: string, @Query() dto: SyncPullDto) {
    return this.service.pull(pharmacyId, dto);
  }

  @Get('operations/:idempotencyKey')
  @RequirePermissions(PERMISSIONS.SYNC_PULL)
  @ApiOperation({ summary: 'Consultar estado persistido de uma operacao de sincronizacao' })
  getOperation(
    @Tenant() pharmacyId: string,
    @Param('idempotencyKey', new ParseUUIDPipe({ version: '4' })) idempotencyKey: string,
    @Query('clientId') clientId: string,
  ) {
    if (!clientId) {
      throw new BadRequestException('clientId e obrigatorio.');
    }
    return this.service.getOperation(pharmacyId, idempotencyKey, clientId);
  }

  @Post('push')
  @RequirePermissions(PERMISSIONS.SYNC_PUSH)
  @ApiOperation({ summary: 'Sincronizar operações offline' })
  push(@Tenant() pharmacyId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: SyncPushDto) {
    return this.service.push(pharmacyId, user.id, dto);
  }
}