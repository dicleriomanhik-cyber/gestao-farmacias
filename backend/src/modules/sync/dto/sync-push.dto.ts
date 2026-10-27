import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, IsUUID, ValidateNested, Allow } from 'class-validator';

export class SyncOperationDto {
  @ApiProperty()
  @IsUUID()
  idempotencyKey!: string;

  @ApiProperty({ example: 'SALE' })
  @IsString()
  operationType!: string;

  @ApiProperty()
  @Allow()
  payload!: any;
}

export class SyncPushDto {
  @ApiProperty()
  @IsUUID()
  clientId!: string;

  @ApiProperty({ example: '1.0.0' })
  @IsString()
  appVersion!: string;

  @ApiProperty({ type: [SyncOperationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SyncOperationDto)
  operations!: SyncOperationDto[];
}