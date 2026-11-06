import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { emitOutboxEvent } from '../sync/outbox.helper';
import { InvoiceLineDto } from './dto/invoice-line.dto';

export interface InvoiceLineInput {
  productId?: string;
  productName?: string;
  type?: string;
  strength?: string;
  quantity: number;
  unitCost: number;
  discount: number;
  subtotal: number;
  innerCount?: number;
  unitsPerInner?: number;
  unitsPerBox?: number;
}

export interface PurchaseLineData {
  productId: string;
  quantity: number;
  unitCost: number;
  discount: number;
  subtotal: number;
  innerCount: number | null;
  unitsPerInner: number | null;
  unitsPerBox: number | null;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function lineInput(line: InvoiceLineDto): InvoiceLineInput {
  const discount = line.discount || 0;
  const subtotal = r2(line.quantity * line.unitCost - discount);
  if (subtotal < 0) throw new BadRequestException('Desconto superior ao valor da linha.');
  return {
    productId: line.productId,
    productName: line.productName,
    type: line.type,
    strength: line.strength,
    quantity: line.quantity,
    unitCost: line.unitCost,
    discount,
    subtotal,
    innerCount: line.innerCount,
    unitsPerInner: line.unitsPerInner,
    unitsPerBox: line.unitsPerBox,
  };
}

export async function resolveLineProducts(
  tx: Prisma.TransactionClient,
  pharmacyId: string,
  actorId: string,
  lines: InvoiceLineInput[],
): Promise<PurchaseLineData[]> {
  const ids = Array.from(new Set(lines.map((l) => l.productId).filter((x): x is string => !!x)));
  if (ids.length > 0) {
    const found = await tx.product.count({ where: { id: { in: ids }, pharmacyId } });
    if (found !== ids.length) throw new BadRequestException('Um ou mais produtos s\u00e3o inv\u00e1lidos.');
  }
  const out: PurchaseLineData[] = [];
  for (const l of lines) {
    let productId = l.productId;
    const medicine = l.type === 'MEDICINE';
    if (!productId) {
      const name = (l.productName ?? '').trim();
      if (!name) throw new BadRequestException('Indica o nome do produto em cada linha.');
      if (l.type !== 'MEDICINE' && l.type !== 'PRODUCT') {
        throw new BadRequestException('Indica se a linha \u00e9 medicamento ou produto: ' + name + '.');
      }
      const strength = medicine ? (l.strength ?? '').trim() : '';
      if (medicine && !strength) throw new BadRequestException('Indica a dosagem do medicamento ' + name + '.');
      const existing = await tx.product.findFirst({
        where: {
          pharmacyId,
          type: l.type as any,
          name: { equals: name, mode: 'insensitive' },
          ...(medicine ? { strength: { equals: strength, mode: 'insensitive' } } : {}),
        },
      });
      if (existing) {
        productId = existing.id;
      } else {
        const created = await tx.product.create({
          data: { pharmacyId, name, type: l.type as any, salePrice: 0, ...(medicine ? { strength, activeIngredient: name } : {}) },
        });
        await tx.auditLog.create({
          data: { pharmacyId, userId: actorId, action: 'product.create', entity: 'Product', entityId: created.id },
        });
        await emitOutboxEvent(tx, pharmacyId, 'PRODUCT', created.id, 'CREATED', created as any);
        productId = created.id;
      }
    }
    const perBox = l.unitsPerBox ?? (l.innerCount && l.unitsPerInner ? l.innerCount * l.unitsPerInner : null);
    const lineType = l.productId ? (await tx.product.findUnique({ where: { id: l.productId }, select: { type: true } }))?.type : l.type;
    if (lineType === 'PRODUCT' && !perBox) throw new BadRequestException('Indica as unidades por caixa do produto' + (l.productName ? ' ' + l.productName : '') + '.');
    out.push({
      productId: productId as string,
      quantity: l.quantity,
      unitCost: l.unitCost,
      discount: l.discount,
      subtotal: l.subtotal,
      innerCount: l.innerCount ?? null,
      unitsPerInner: l.unitsPerInner ?? null,
      unitsPerBox: perBox,
    });
  }
  return out;
}