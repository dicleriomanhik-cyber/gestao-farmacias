import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

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

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  supplierExtraFields?: boolean;

  @ApiPropertyOptional({ enum: ['BY_VALUE', 'BY_UNITS'] })
  @IsIn(['BY_VALUE', 'BY_UNITS'])
  @IsOptional()
  extrasSplitMode?: 'BY_VALUE' | 'BY_UNITS';

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(50)
  @IsOptional()
  vatRegime?: string;
}