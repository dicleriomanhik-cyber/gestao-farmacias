// @ts-nocheck
import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SALES_READ)
  @ApiOperation({ summary: 'Definicoes da farmacia' })
  get(@Tenant() pharmacyId: string) {
    return this.service.get(pharmacyId);
  }

  @Patch()
  @RequirePermissions(PERMISSIONS.PHARMACY_CONFIG_WRITE)
  @ApiOperation({ summary: 'Actualizar definicoes da farmacia' })
  update(@Tenant() pharmacyId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateSettingsDto) {
    return this.service.update(pharmacyId, user.id, dto);
  }
}