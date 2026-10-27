import { Prisma } from '@prisma/client';

export async function emitOutboxEvent(
  tx: Prisma.TransactionClient,
  pharmacyId: string,
  entityType: 'PRODUCT' | 'STOCK_LOT' | 'SALE' | 'SALE_PAYMENT',
  entityId: string,
  action: 'CREATED' | 'UPDATED' | 'CONFIRMED',
  payload: any,
): Promise<void> {
  // Garantir linha de checkpoint
  await tx.$executeRaw`
    INSERT INTO "sync_checkpoints" ("pharmacyId", "lastCommittedSequence", "updatedAt")
    VALUES (${pharmacyId}::uuid, 0, NOW())
    ON CONFLICT ("pharmacyId") DO NOTHING
  `;

  // Lock do checkpoint para serializar escritas desta farmácia
  const rows = await tx.$queryRaw<Array<{ lastCommittedSequence: bigint }>>`
    SELECT "lastCommittedSequence" FROM "sync_checkpoints"
    WHERE "pharmacyId" = ${pharmacyId}::uuid
    FOR UPDATE
  `;

  const last = rows[0]?.lastCommittedSequence ?? BigInt(0);

  const created = await tx.outboxEvent.create({
    data: { pharmacyId, entityType, entityId, action, payload },
    select: { sequence: true },
  });

  if (created.sequence <= last) {
    throw new Error(`outbox sequence ${created.sequence} <= checkpoint ${last}`);
  }

  await tx.syncCheckpoint.update({
    where: { pharmacyId },
    data: { lastCommittedSequence: created.sequence },
  });
}