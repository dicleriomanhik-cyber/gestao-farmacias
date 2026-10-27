import { saleUnitLabel } from '../../src/modules/products/sale-unit.helper';

describe('saleUnitLabel', () => {
  it('MEDICINE -> carteira', () => expect(saleUnitLabel('MEDICINE')).toBe('carteira'));
  it('PRODUCT -> unidade', () => expect(saleUnitLabel('PRODUCT')).toBe('unidade'));
  it('string desconhecida cai em unidade', () => expect(saleUnitLabel('XYZ')).toBe('unidade'));
});