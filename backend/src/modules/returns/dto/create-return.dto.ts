// @ts-nocheck
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ReturnLineDto {
  @ApiProperty()
  @IsUUID()
  saleLineId!: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lotNumber?: string; // Se o operador souber o lote devolvido

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  expiryDate?: string;
}

export class CreateReturnDto {
  @ApiProperty()
  @IsUUID()
  saleId!: string;

  @ApiProperty({ example: 'Cliente devolveu por engano' })
  @IsString()
  reason!: string;

  @ApiProperty({ type: [ReturnLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnLineDto)
  lines!: ReturnLineDto[];
}