import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PharmacyService } from './pharmacy.service';
import { UpdatePharmacyDto } from './dto/update-pharmacy.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('pharmacy')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('pharmacy')
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PHARMACY_CONFIG_READ)
  @ApiOperation({ summary: 'Obter dados da farmácia autenticada' })
  getPharmacy(@Tenant() pharmacyId: string) {
    return this.pharmacyService.getPharmacy(pharmacyId);
  }

  @Patch()
  @RequirePermissions(PERMISSIONS.PHARMACY_CONFIG_WRITE)
  @ApiOperation({ summary: 'Actualizar dados da farmácia autenticada' })
  updatePharmacy(
    @Tenant() pharmacyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePharmacyDto,
  ) {
    return this.pharmacyService.updatePharmacy(pharmacyId, user.id, dto);
  }
}