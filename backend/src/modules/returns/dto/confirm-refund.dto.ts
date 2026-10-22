import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum RefundConfirmationStatusDto {
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export class ConfirmRefundDto {
  @ApiProperty({ enum: RefundConfirmationStatusDto })
  @IsEnum(RefundConfirmationStatusDto)
  status!: RefundConfirmationStatusDto;

  @ApiProperty({ example: 'MPESA-REF-123456' })
  @IsString()
  externalReference!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}