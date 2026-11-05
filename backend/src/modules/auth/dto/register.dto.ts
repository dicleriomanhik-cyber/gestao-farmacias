import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Farmacia Central' })
  @IsString()
  pharmacyName!: string;

  @ApiPropertyOptional({ example: '123456789' })
  @IsString()
  @IsOptional()
  pharmacyNif?: string;

  @ApiPropertyOptional({ example: 'Admin' })
  @IsOptional()
  @IsString()
  adminName?: string;

  @ApiProperty({ example: 'admin@farmacia.mz' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'password456' })
  @IsString()
  @MinLength(8)
  posPassword!: string;
}