// @ts-nocheck
import { ArrayMaxSize, IsArray, IsIn, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SyncOperationDto {
  @IsString()
  idempotencyKey!: string;

  @IsIn(['CASH_OPEN', 'SALE', 'PAYMENT', 'EXPENSE', 'EXPENSE_CONFIRM', 'EXPENSE_CANCEL', 'EXPENSE_UPDATE', 'RETURN', 'RETURN_CONFIRM', 'RETURN_INSPECT', 'RETURN_CANCEL', 'REFUND', 'CASH_CLOSE', 'CATEGORY_CREATE', 'CATEGORY_UPDATE', 'PRODUCT_CREATE', 'STOCK_BOX_CREATE'])
  operationType!: 'CASH_OPEN' | 'SALE' | 'PAYMENT';

  @IsObject()
  payload!: Record<string, any>;
}

export class SyncPushDto {
  @IsString()
  clientId!: string;

  @IsOptional()
  @IsString()
  clientVersion?: string;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SyncOperationDto)
  operations!: SyncOperationDto[];
}
