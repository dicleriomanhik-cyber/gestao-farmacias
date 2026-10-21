import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum RefundMethodDto {
  CASH = 'CASH',
  CARD = 'CARD',
  MPESA = 'MPESA',
  EMOLA = 'EMOLA',
  TRANSFER = 'TRANSFER',
  OTHER = 'OTHER',
}

export class RefundDto {
  @ApiProperty({ enum: RefundMethodDto })
  @IsEnum(RefundMethodDto)
  method!: RefundMethodDto;

  @ApiProperty({ example: 100.00 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  cashSessionId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  salePaymentId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}