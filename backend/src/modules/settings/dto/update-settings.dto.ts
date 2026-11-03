// @ts-nocheck
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  allowCashExpenses?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  collaboratorExpenses?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  requireApprovalForCash?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  usePayables?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  multiCurrency?: boolean;

  @ApiPropertyOptional({ example: 'BY_VALUE' })
  @IsIn(['BY_VALUE', 'BY_UNITS'])
  @IsOptional()
  extrasSplitMode?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  supplierExtraFields?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  vatRegime?: string | null;
}