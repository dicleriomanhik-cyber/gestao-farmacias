import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'João Silva Novo' })
  @IsString()
  @MinLength(3)
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ example: 'SUSPENDED' })
  @IsString()
  @IsOptional()
  status?: string;
}
