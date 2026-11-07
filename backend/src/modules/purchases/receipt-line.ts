import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export async function lockReceiptLine(tx: Prisma.TransactionClient, pharmacyId: string, lineId: string) {
  if (!lineId) throw new BadRequestException('Linha da factura em falta.');
  await tx.$queryRaw`SELECT id FROM "purchase_lines" WHERE id = ${lineId}::uuid FOR UPDATE`;
  const line = await tx.purchaseLine.findUnique({ where: { id: lineId }, include: { purchase: { select: { pharmacyId: true, status: true } } } });
  if (!line || line.purchase.pharmacyId !== pharmacyId) throw new NotFoundException('Linha da factura nao encontrada.');
  if (line.purchase.status !== 'CONFIRMED') throw new BadRequestException('A factura precisa de estar confirmada.');
  if (line.closed) throw new BadRequestException('Esta linha ja esta fechada.');
  const received = await tx.stockLot.count({ where: { purchaseLineId: lineId } });
  return { ...line, received };
}