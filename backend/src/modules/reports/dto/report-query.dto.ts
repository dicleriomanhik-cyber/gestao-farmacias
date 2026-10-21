import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export enum ExpenseCategoryFilter {
  RENT = 'RENT',
  UTILITIES = 'UTILITIES',
  TRANSPORT = 'TRANSPORT',
  CONSUMABLES = 'CONSUMABLES',
  MAINTENANCE = 'MAINTENANCE',
  SALARIES = 'SALARIES',
  TAXES = 'TAXES',
  OTHER = 'OTHER',
}

export enum PaymentMethodFilter {
  CASH = 'CASH',
  CARD = 'CARD',
  MPESA = 'MPESA',
  EMOLA = 'EMOLA',
  TRANSFER = 'TRANSFER',
  OTHER = 'OTHER',
}

export class ReportQueryDto {
  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filtrar por estado (ex: CONFIRMED)' })
  @IsString()
  @IsOptional()
  status?: string;
}

export class ExpenseReportQueryDto extends ReportQueryDto {
  @ApiPropertyOptional({ enum: ExpenseCategoryFilter })
  @IsEnum(ExpenseCategoryFilter)
  @IsOptional()
  category?: ExpenseCategoryFilter;

  @ApiPropertyOptional({ enum: PaymentMethodFilter })
  @IsEnum(PaymentMethodFilter)
  @IsOptional()
  method?: PaymentMethodFilter;
}