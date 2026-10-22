import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserStatus } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'farmaceutico@farmacia.co.mz' })
  @IsEmail({}, { message: 'Email inválido.' })
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'A password deve ter pelo menos 8 caracteres.' })
  password!: string;

  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ example: 'PHARMACIST', enum: ['ADMIN', 'PHARMACIST', 'CASHIER', 'STOCK_MANAGER'] })
  @IsString()
  @IsNotEmpty()
  roleName!: string;

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsEnum(UserStatus, { message: 'O status deve ser ACTIVE, INACTIVE ou SUSPENDED.' })
  @IsOptional()
  status?: UserStatus;
}