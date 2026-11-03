// @ts-nocheck
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ConfirmPurchaseDto {
  @ApiPropertyOptional({ example: 'MPESA' })
  @IsString()
  @IsOptional()
  paidFrom?: string;

  @ApiPropertyOptional({ example: 'MPESA' })
  @IsString()
  @IsOptional()
  method?: string;
}