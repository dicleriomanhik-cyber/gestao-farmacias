import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNumber, IsString, IsUUID, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLotDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 'LOTE-2026-001' })
  @IsString()
  @MaxLength(100)
  lotNumber!: string;

  @ApiProperty({ example: '2027-12-31' })
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