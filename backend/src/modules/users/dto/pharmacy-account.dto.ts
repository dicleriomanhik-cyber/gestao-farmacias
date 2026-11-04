import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePharmacyAccountDto {
  @ApiProperty({ example: 'Farmácia Central' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  pharmacyName!: string;

  @ApiProperty({ type: [String], example: ['Maria Chissano', 'João Macamo'] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Indica pelo menos um colaborador.' })
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MinLength(2, { each: true })
  @MaxLength(60, { each: true })
  operatorNames!: string[];

  @ApiProperty({ example: 'caixa@farmacia.co.mz' })
  @IsEmail({}, { message: 'Email inválido.' })
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'A password deve ter pelo menos 8 caracteres.' })
  password!: string;
}

export class UpdatePharmacyAccountDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsOptional()
  pharmacyName?: string;

  @ApiPropertyOptional({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'A password deve ter pelo menos 8 caracteres.' })
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsIn(['ACTIVE', 'INACTIVE'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE';
}