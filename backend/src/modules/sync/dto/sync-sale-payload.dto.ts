import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class SyncSaleLineDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  discount?: number;
}

export class SyncSalePayloadDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [SyncSaleLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SyncSaleLineDto)
  lines!: SyncSaleLineDto[];
}