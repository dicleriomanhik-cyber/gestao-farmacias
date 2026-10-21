// @ts-nocheck
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateSaleDto } from './create-sale.dto';

export class UpdateSaleDto extends PartialType(OmitType(CreateSaleDto, ['lines'] as const)) {}