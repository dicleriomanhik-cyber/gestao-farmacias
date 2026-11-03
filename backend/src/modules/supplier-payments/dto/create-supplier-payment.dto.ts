// @ts-nocheck
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSupplierPaymentDto {
  @ApiProperty()
  @IsUUID()
  purchaseId!: string;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ example: 'MPESA' })
  @IsString()
  @IsNotEmpty()
  paidFrom!: string;

  @ApiProperty({ example: 'MPESA' })
  @IsString()
  @IsNotEmpty()
  method!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}