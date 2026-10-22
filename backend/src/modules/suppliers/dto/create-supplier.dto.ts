import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SupplierStatus } from '@prisma/client';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Distribuidora Farmacêutica Lda' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: '400123456' })
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiPropertyOptional({ example: '+258840000000' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'vendas@distribuidora.co.mz' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  province?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ enum: SupplierStatus, default: SupplierStatus.ACTIVE })
  @IsEnum(SupplierStatus, { message: 'O status deve ser ACTIVE ou INACTIVE.' })
  @IsOptional()
  status?: SupplierStatus;
}