import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReturnLineConditionDto {
  RESELLABLE = 'RESELLABLE',
  DAMAGED = 'DAMAGED',
  EXPIRED = 'EXPIRED',
  LOST = 'LOST',
}

export class InspectReturnDto {
  @ApiProperty({ enum: ReturnLineConditionDto })
  @IsEnum(ReturnLineConditionDto)
  condition!: ReturnLineConditionDto;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantityToRelease!: number;
}