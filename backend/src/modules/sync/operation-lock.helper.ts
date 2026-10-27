import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export async function withSyncOperationLock<T>(
  prisma: PrismaService,
  pharmacyId: string,
  idempotencyKey: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(
        ('x' || substr(md5(${pharmacyId}::text || '|' || ${idempotencyKey}::text), 1, 8))::bit(32)::int,
        ('x' || substr(md5(${pharmacyId}::text || '|' || ${idempotencyKey}::text), 9, 8))::bit(32)::int
      )
    `;
    return fn(tx);
  });
}