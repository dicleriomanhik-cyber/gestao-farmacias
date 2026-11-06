import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class DamagedLineDto {
  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}