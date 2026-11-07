import { IsNotEmpty, IsString } from 'class-validator';

export class ResetDataDto {
  @IsString()
  @IsNotEmpty()
  password!: string;
}