import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBoxesBatchDto {
  @ApiProperty({ description: 'Linha da factura confirmada.' })
  @IsUUID()
  purchaseLineId!: string;

  @ApiProperty({ type: [String], description: 'Um QR por caixa.' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  qrCodes!: string[];

  @ApiPropertyOptional({ example: '2027-12-31' })
  @IsISO8601()
  @IsOptional()
  expiryDate?: string;

  @ApiPropertyOptional({ example: 25 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  salePrice?: number;

  @ApiPropertyOptional({ description: 'Receber sem data de validade.' })
  @IsBoolean()
  @IsOptional()
  noExpiry?: boolean;
}