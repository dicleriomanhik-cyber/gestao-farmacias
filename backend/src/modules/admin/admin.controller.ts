import { Controller, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('admin')
@UseGuards(PermissionsGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('reset-test-data')
  @RequirePermissions('users:write') // apenas o gestor
  async resetTestData(@CurrentUser() user: any) {
    return this.adminService.resetTestData(user.pharmacyId);
  }
}

