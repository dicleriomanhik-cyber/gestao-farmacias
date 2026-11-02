import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export const PAID_FROM_VALUES = ['PHARMACY_CASH', 'OWNER_CASH', 'BANK', 'MPESA', 'EMOLA', 'OTHER'];
export const METHOD_VALUES = ['CASH', 'CARD', 'MPESA', 'EMOLA', 'TRANSFER', 'OTHER'];

export class CreateSupplierPaymentDto {
  @ApiProperty()
  @IsUUID()
  purchaseId!: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ enum: PAID_FROM_VALUES })
  @IsIn(PAID_FROM_VALUES)
  paidFrom!: string;

  @ApiProperty({ enum: METHOD_VALUES })
  @IsIn(METHOD_VALUES)
  method!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}