import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum SyncPaymentMethodDto {
  CASH = 'CASH',
  CARD = 'CARD',
  MPESA = 'MPESA',
  EMOLA = 'EMOLA',
  TRANSFER = 'TRANSFER',
  OTHER = 'OTHER',
}

export class SyncPaymentPayloadDto {
  @ApiProperty()
  @IsUUID()
  saleId!: string;

  @ApiProperty({ enum: SyncPaymentMethodDto })
  @IsEnum(SyncPaymentMethodDto)
  method!: SyncPaymentMethodDto;

  @ApiProperty({ example: 500.0 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ description: 'UUID v4 — igual a idempotencyKey do SyncOperation' })
  @IsUUID('4')
  idempotencyKey!: string;
}