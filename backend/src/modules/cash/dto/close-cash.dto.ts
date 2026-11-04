import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CloseCashDto {
  @ApiProperty({ example: 1500.00 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  countedBalance!: number;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  operatorId?: string;
}