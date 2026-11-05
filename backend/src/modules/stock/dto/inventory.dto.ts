import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested } from 'class-validator';

export class CreateInventoryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(300)
  notes?: string;
}

export class InventoryLineCountDto {
  @IsUUID()
  lineId!: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  countedQty?: number | null;
}

export class SaveInventoryCountsDto {
  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => InventoryLineCountDto)
  lines!: InventoryLineCountDto[];
}