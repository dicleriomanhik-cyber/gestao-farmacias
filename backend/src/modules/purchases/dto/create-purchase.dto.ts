import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseLineDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @ApiProperty({ example: 50.00 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitCost!: number;

  @ApiPropertyOptional({ example: 5.00 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  discount?: number;
}

export class CreatePurchaseDto {
  @ApiProperty()
  @IsUUID()
  supplierId!: string;

  @ApiProperty({ example: 'FAT-2023-001' })
  @IsString()
  documentNumber!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 150 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  transportCost?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  otherCosts?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  invoiceTotal?: number;

  @ApiPropertyOptional({ example: 'MZN' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @Min(0.000001)
  @Type(() => Number)
  @IsOptional()
  exchangeRate?: number;

  @ApiPropertyOptional({ enum: ['PAID', 'CREDIT'] })
  @IsIn(['PAID', 'CREDIT'])
  @IsOptional()
  paymentStatus?: 'PAID' | 'CREDIT';

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ type: [PurchaseLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseLineDto)
  lines?: PurchaseLineDto[];
}