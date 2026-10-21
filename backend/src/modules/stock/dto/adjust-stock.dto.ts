// @ts-nocheck
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class AdjustStockDto {
  @ApiProperty()
  @IsUUID()
  lotId!: string;

  @ApiProperty({ example: -5, description: 'Positivo para entrada, Negativo para saída' })
  @IsInt()
  @Type(() => Number)
  quantity!: number;

  @ApiProperty({ example: 'Ajuste de inventário' })
  @IsString()
  reason!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}