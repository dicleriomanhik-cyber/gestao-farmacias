export type PackState = 'EMPTY' | 'IN_USE' | 'FULL';

export interface PackInfo {
  number: number;
  state: PackState;
  usedInPack: number;
  availableInPack: number;
}

export interface PackDerivation {
  packs: PackInfo[];
  currentPackNumber: number | null;
  consumedUnits: number;
}

/**
 * Deriva o estado das caixinhas de uma caixa de medicamento.
 * @param totalUnits Total de unidades de venda que a caixa tinha originalmente.
 * @param unitsPerInner Carteiras por caixinha.
 * @param quantityAvailable Unidades de venda actualmente disponíveis na caixa.
 */
export function derivePackState(
  totalUnits: number,
  unitsPerInner: number,
  quantityAvailable: number,
): PackDerivation {
  if (!Number.isInteger(totalUnits) || !Number.isInteger(unitsPerInner) || !Number.isInteger(quantityAvailable)) {
    throw new Error('derivePackState: argumentos devem ser inteiros.');
  }
  if (totalUnits < 0 || quantityAvailable < 0 || unitsPerInner <= 0) {
    throw new Error('derivePackState: valores fora de alcance.');
  }
  if (quantityAvailable > totalUnits) {
    throw new Error('derivePackState: quantityAvailable nao pode exceder totalUnits.');
  }

  const consumedUnits = totalUnits - quantityAvailable;
  const totalPacks = Math.ceil(totalUnits / unitsPerInner);

  const packs: PackInfo[] = [];
  let currentPackNumber: number | null = null;

  for (let n = 1; n <= totalPacks; n++) {
    const capacity = Math.min(unitsPerInner, totalUnits - (n - 1) * unitsPerInner);
    const availableBefore = Math.max(0, capacity - Math.max(0, consumedUnits - (n - 1) * unitsPerInner));
    const usedInPack = capacity - availableBefore;

    let state: PackState;
    if (availableBefore === 0) state = 'EMPTY';
    else if (availableBefore === capacity) state = 'FULL';
    else { state = 'IN_USE'; currentPackNumber = n; }

    if (state !== 'EMPTY') {
      packs.push({ number: n, state, usedInPack, availableInPack: availableBefore });
    }
  }

  return { packs, currentPackNumber, consumedUnits };
}