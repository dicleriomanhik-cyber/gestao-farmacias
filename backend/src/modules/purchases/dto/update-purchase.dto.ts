// @ts-nocheck
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePurchaseDto } from './create-purchase.dto';

// O update permite alterar dados gerais, mas as linhas são geridas pelo serviço
export class UpdatePurchaseDto extends PartialType(OmitType(CreatePurchaseDto, ['lines'] as const)) {}