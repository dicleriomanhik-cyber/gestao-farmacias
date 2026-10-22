import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNumber, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ReceiveStockDto {
  @ApiProperty()
  @IsUUID()
  purchaseLineId!: string;

  @ApiProperty()
  @IsString()
  lotNumber!: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateString()
  expiryDate!: string;

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
}