import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@farmacia.co.mz' })
  @IsEmail({}, { message: 'Email inválido.' })
  email!: string;

  @ApiProperty({ example: 'S3nh4Forte!' })
  @IsString()
  @MinLength(8, { message: 'A palavra-passe deve ter pelo menos 8 caracteres.' })
  password!: string;
}
