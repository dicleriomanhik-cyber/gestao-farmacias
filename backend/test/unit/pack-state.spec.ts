import { derivePackState } from '../../src/modules/stock/pack-state.helper';

describe('derivePackState', () => {
  it('caixa intocada: todas as caixinhas cheias', () => {
    const r = derivePackState(10, 5, 10);
    expect(r.packs).toEqual([
      { number: 1, state: 'FULL', usedInPack: 0, availableInPack: 5 },
      { number: 2, state: 'FULL', usedInPack: 0, availableInPack: 5 },
    ]);
    expect(r.currentPackNumber).toBeNull();
    expect(r.consumedUnits).toBe(0);
  });

  it('caixinha parcialmente consumida: IN_USE', () => {
    const r = derivePackState(10, 5, 7);
    expect(r.packs).toEqual([
      { number: 1, state: 'IN_USE', usedInPack: 3, availableInPack: 2 },
      { number: 2, state: 'FULL', usedInPack: 0, availableInPack: 5 },
    ]);
    expect(r.currentPackNumber).toBe(1);
    expect(r.consumedUnits).toBe(3);
  });

  it('uma caixinha esgotada e a segunda intacta', () => {
    const r = derivePackState(10, 5, 5);
    expect(r.packs).toEqual([{ number: 2, state: 'FULL', usedInPack: 0, availableInPack: 5 }]);
    expect(r.currentPackNumber).toBeNull();
  });

  it('caixa vazia: nenhuma caixinha', () => {
    const r = derivePackState(10, 5, 0);
    expect(r.packs).toEqual([]);
    expect(r.currentPackNumber).toBeNull();
  });

  it('erro: quantityAvailable > totalUnits', () => {
    expect(() => derivePackState(10, 5, 11)).toThrow();
  });

  it('erro: unitsPerInner = 0', () => {
    expect(() => derivePackState(10, 0, 5)).toThrow();
  });

  it('totalUnits nao multiplo de unitsPerInner', () => {
    const r = derivePackState(7, 5, 7);
    expect(r.packs.length).toBe(2);
    expect(r.packs[0].state).toBe('FULL');
    expect(r.packs[1].state).toBe('FULL');
    expect(r.packs[1].availableInPack).toBe(2);
  });
});