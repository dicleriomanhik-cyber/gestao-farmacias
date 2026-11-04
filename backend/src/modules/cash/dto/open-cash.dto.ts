import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OpenCashDto {
  @ApiProperty({ example: 1000.00 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  openingBalance!: number;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  operatorId?: string;
}