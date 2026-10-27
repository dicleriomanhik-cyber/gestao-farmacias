import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SyncPullDto {
  @ApiPropertyOptional({ example: 'bfd66653-45f7-4466-b1bc-4fc5f9b27918' })
  @IsString()
  clientId!: string;

  @ApiPropertyOptional({ description: 'Cursor opaco Base64 (sequence)' })
  @IsString()
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({ default: 50, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 50;
}