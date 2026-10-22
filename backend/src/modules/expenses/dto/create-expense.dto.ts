import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ExpenseCategoryDto {
  RENT = 'RENT',
  UTILITIES = 'UTILITIES',
  TRANSPORT = 'TRANSPORT',
  CONSUMABLES = 'CONSUMABLES',
  MAINTENANCE = 'MAINTENANCE',
  SALARIES = 'SALARIES',
  TAXES = 'TAXES',
  OTHER = 'OTHER',
}

export enum ExpenseMethodDto {
  CASH = 'CASH',
  CARD = 'CARD',
  MPESA = 'MPESA',
  EMOLA = 'EMOLA',
  TRANSFER = 'TRANSFER',
  OTHER = 'OTHER',
}

export class CreateExpenseDto {
  @ApiProperty({ example: 'Renda da farmácia - Outubro' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ enum: ExpenseCategoryDto })
  @IsEnum(ExpenseCategoryDto)
  category!: ExpenseCategoryDto;

  @ApiProperty({ example: 15000.00 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ enum: ExpenseMethodDto })
  @IsEnum(ExpenseMethodDto)
  method!: ExpenseMethodDto;

  @ApiPropertyOptional({ example: '2026-10-21' })
  @IsDateString()
  @IsOptional()
  expenseDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  externalReference?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}