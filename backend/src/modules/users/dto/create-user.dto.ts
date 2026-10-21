import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

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

  @ApiProperty({ example: 'ACTIVE', required: false })
  @IsString()
  @IsOptional() // <--- ESTA É A CORREÇÃO
  status?: string;
}