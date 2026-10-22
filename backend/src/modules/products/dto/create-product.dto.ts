import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, MaxLength } from 'class-validator';
import { ProductStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Paracetamol 500mg' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'PARA500' })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ example: '1234567890123' })
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiPropertyOptional({ example: 'Paracetamol' })
  @IsString()
  @IsOptional()
  activeIngredient?: string;

  @ApiPropertyOptional({ example: 'Comprimido' })
  @IsString()
  @IsOptional()
  dosageForm?: string;

  @ApiPropertyOptional({ example: '500mg' })
  @IsString()
  @IsOptional()
  strength?: string;

  @ApiPropertyOptional({ example: 'CX' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ example: 150.50 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  salePrice!: number;

  @ApiPropertyOptional({ example: 100.00 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  referenceCost?: number;

  @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.ACTIVE })
  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @ApiPropertyOptional({ example: 'uuid-da-categoria' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;
}