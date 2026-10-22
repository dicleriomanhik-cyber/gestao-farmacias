import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePurchaseDto } from './create-purchase.dto';

export class UpdatePurchaseDto extends PartialType(OmitType(CreatePurchaseDto, ['lines'] as const)) {}