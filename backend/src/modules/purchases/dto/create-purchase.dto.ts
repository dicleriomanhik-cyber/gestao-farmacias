// @ts-nocheck
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseLineDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
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

  @ApiProperty({ type: [PurchaseLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseLineDto)
  lines!: PurchaseLineDto[];
}