import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsUUID, Min } from 'class-validator';
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

  @ApiProperty({ description: 'Chave de idempotencia (UUID v4) — obrigatoria' })
  @IsUUID('4')
  idempotencyKey!: string;
}