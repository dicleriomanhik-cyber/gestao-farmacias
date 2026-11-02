import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { METHOD_VALUES, PAID_FROM_VALUES } from './create-supplier-payment.dto';

export class ConfirmPurchaseDto {
  @ApiPropertyOptional({ enum: PAID_FROM_VALUES })
  @IsOptional()
  @IsIn(PAID_FROM_VALUES)
  paidFrom?: string;

  @ApiPropertyOptional({ enum: METHOD_VALUES })
  @IsOptional()
  @IsIn(METHOD_VALUES)
  method?: string;
}