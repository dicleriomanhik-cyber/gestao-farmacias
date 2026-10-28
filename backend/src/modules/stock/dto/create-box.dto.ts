import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsISO8601, IsOptional, IsString, IsUUID, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBoxDto {
  @ApiPropertyOptional({ example: 'uuid-do-produto' })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ example: 'Paracetamol 500mg' })
  @IsString()
  @IsOptional()
  productName?: string;

  @ApiProperty({ example: 'QR-ABC-001' })
  @IsString()
  @MaxLength(120)
  qrCode!: string;

  @ApiPropertyOptional({ example: 'LOTE-2026-001', description: 'Se omitido, assume qrCode.' })
  @IsString()
  @IsOptional()
  lotNumber?: string;

  @ApiPropertyOptional({ example: '2027-12-31', description: 'Obrigatorio se hasExpiry=true.' })
  @IsISO8601()
  @IsOptional()
  expiryDate?: string;

  @ApiPropertyOptional({ example: 10, description: 'Obrigatorio para MEDICINE.' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  innerCount?: number;

  @ApiPropertyOptional({ example: 5, description: 'Obrigatorio para MEDICINE.' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  unitsPerInner?: number;

  @ApiPropertyOptional({ example: 50, description: 'Obrigatorio para PRODUCT. Para MEDICINE calculado = innerCount*unitsPerInner.' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  totalUnits?: number;

  @ApiProperty({ example: 100.0 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  unitCost!: number;
}
