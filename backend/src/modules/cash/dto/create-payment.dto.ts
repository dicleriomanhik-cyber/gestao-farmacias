// @ts-nocheck
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethodDto {
  CASH = 'CASH',
  CARD = 'CARD',
  MPESA = 'MPESA',
  EMOLA = 'EMOLA',
  TRANSFER = 'TRANSFER',
  OTHER = 'OTHER',
}

export class CreatePaymentDto {
  @ApiProperty()
  @IsUUID()
  saleId!: string;

  @ApiProperty({ enum: PaymentMethodDto })
  @IsEnum(PaymentMethodDto)
  method!: PaymentMethodDto;

  @ApiProperty({ example: 500.00 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @ApiPropertyOptional({ description: 'Chave de idempotência para evitar duplicação' })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}