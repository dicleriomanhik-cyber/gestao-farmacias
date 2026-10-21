// @ts-nocheck
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OpenCashDto {
  @ApiProperty({ example: 1000.00 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  openingBalance!: number;
}