import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateOperatorDto {
  @ApiProperty({ example: 'Maria Chissano' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name!: string;
}