import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceLineDto {
  @ApiPropertyOptional({ description: 'Linha existente da fatura (edicao de fatura confirmada).' })
  @IsUUID()
  @IsOptional()
  lineId?: string;

  @ApiPropertyOptional({ description: 'Produto existente. Se omitido, usa productName + type (+ strength nos medicamentos).' })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ example: 'Paracetamol' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  productName?: string;

  @ApiPropertyOptional({ enum: ['MEDICINE', 'PRODUCT'] })
  @IsIn(['MEDICINE', 'PRODUCT'])
  @IsOptional()
  type?: 'MEDICINE' | 'PRODUCT';

  @ApiPropertyOptional({ example: '500mg', description: 'Dosagem. So para medicamentos.' })
  @IsString()
  @MaxLength(60)
  @IsOptional()
  strength?: string;

  @ApiProperty({ example: 10, description: 'Quantidade de caixas.' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @ApiProperty({ example: 500, description: 'Preco por caixa.' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitCost!: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  innerCount?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  unitsPerInner?: number;

  @ApiPropertyOptional({ description: 'Unidades por caixa. Se omitido e houver innerCount e unitsPerInner, calcula-se.' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  unitsPerBox?: number;
}

export class ReplaceLinesDto {
  @ApiProperty({ type: [InvoiceLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines!: InvoiceLineDto[];
}