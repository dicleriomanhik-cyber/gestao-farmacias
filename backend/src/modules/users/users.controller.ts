import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'Listar utilizadores da farmácia' })
  @ApiQuery({ name: 'page', required: false, type: String, example: '1' })
  @ApiQuery({ name: 'limit', required: false, type: String, example: '20' })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'Maria' })
  findAll(
    @Tenant() pharmacyId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(pharmacyId, Number(page), Number(limit), search);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'Obter detalhes de um utilizador' })
  findOne(@Tenant() pharmacyId: string, @Param('id') id: string) {
    return this.usersService.findOne(pharmacyId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USERS_WRITE)
  @ApiOperation({ summary: 'Criar um utilizador' })
  create(@Tenant() pharmacyId: string, @Body() dto: CreateUserDto) {
    return this.usersService.create(pharmacyId, dto);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Alterar a própria password' })
  updateMyPassword(
    @CurrentUser() user: any,
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.usersService.updateMyPassword(user.id, dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.USERS_WRITE)
  @ApiOperation({ summary: 'Actualizar perfil ou estado de um utilizador' })
  update(
    @Tenant() pharmacyId: string,
    @CurrentUser() currentUser: any,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(pharmacyId, currentUser.id, id, dto);
  }
}