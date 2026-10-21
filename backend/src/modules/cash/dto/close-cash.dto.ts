// @ts-nocheck
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CloseCashDto {
  @ApiProperty({ example: 1500.00 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  countedBalance!: number;
}