import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserStatus } from '@prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'João Silva Novo' })
  @IsString()
  @MinLength(3)
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsEnum(UserStatus, { message: 'O status deve ser ACTIVE, INACTIVE ou SUSPENDED.' })
  @IsOptional()
  status?: UserStatus;
}