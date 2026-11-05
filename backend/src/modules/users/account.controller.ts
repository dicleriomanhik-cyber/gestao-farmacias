import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountService } from './account.service';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('account')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('account')
export class AccountController {
  constructor(private readonly service: AccountService) {}

  @Post('delete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Eliminar a conta do administrador, a farmácia e os colaboradores' })
  remove(@CurrentUser() user: AuthenticatedUser, @Body() dto: DeleteAccountDto) {
    return this.service.deleteAccount(user, dto.password);
  }
}