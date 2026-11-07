import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ResetDataDto } from './dto/reset-data.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('admin')
@UseGuards(PermissionsGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('reset-test-data')
  @RequirePermissions('users:write')
  async resetTestData(@CurrentUser() user: any, @Body() dto: ResetDataDto) {
    return this.adminService.resetTestData(user, dto.password);
  }
}