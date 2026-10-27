import { ProductType } from '@prisma/client';

export function saleUnitLabel(type: ProductType | string): string {
  return type === 'MEDICINE' ? 'carteira' : 'unidade';
}