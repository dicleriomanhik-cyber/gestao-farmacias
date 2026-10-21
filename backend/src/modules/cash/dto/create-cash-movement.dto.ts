// @ts-nocheck
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum MovementTypeDto {
  IN = 'IN',
  OUT = 'OUT',
}

export class CreateCashMovementDto {
  @ApiProperty({ enum: MovementTypeDto })
  @IsEnum(MovementTypeDto)
  type!: MovementTypeDto;

  @ApiProperty({ example: 100.00 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ example: 'Compra de material de escritório' })
  @IsString()
  reason!: string;
}