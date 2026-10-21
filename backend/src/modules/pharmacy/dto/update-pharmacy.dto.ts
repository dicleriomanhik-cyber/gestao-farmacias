import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdatePharmacyDto {
  @ApiPropertyOptional({ example: 'Farmácia Central' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Central Farmácias' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  tradeName?: string;

  @ApiPropertyOptional({ example: 'Central, Lda' })
  @IsString()
  @MaxLength(150)
  @IsOptional()
  legalName?: string;

  @ApiPropertyOptional({ example: '400000000' })
  @IsString()
  @MaxLength(20)
  @IsOptional()
  nif?: string;

  @ApiPropertyOptional({ example: '+258840000000' })
  @IsString()
  @MaxLength(20)
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'geral@farmacia.co.mz' })
  @IsEmail({}, { message: 'Email inválido.' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Av. Julius Nyerere, 123' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Maputo' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'Maputo Cidade' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  province?: string;
}