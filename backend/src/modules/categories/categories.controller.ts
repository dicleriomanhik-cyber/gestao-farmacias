import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Criar categoria' })
  create(@Tenant() pharmacyId: string, @Body() dto: CreateCategoryDto) {
    return this.service.create(pharmacyId, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PRODUCTS_READ)
  @ApiOperation({ summary: 'Listar categorias (paginado)' })
  @ApiQuery({ name: 'page', required: false, type: String, example: '1' })
  @ApiQuery({ name: 'limit', required: false, type: String, example: '20' })
  findAll(
    @Tenant() pharmacyId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.service.findAll(pharmacyId, Number(page), Number(limit));
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Actualizar categoria' })
  update(@Tenant() pharmacyId: string, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.update(pharmacyId, id, dto);
  }
}