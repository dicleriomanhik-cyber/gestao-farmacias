import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { withSyncOperationLock } from './operation-lock.helper';
import { PrismaService } from '../../database/prisma.service';
import { SalesService } from '../sales/sales.service';
import { CashService } from '../cash/cash.service';
import { SyncPushDto } from './dto/sync-push.dto';
import { SyncSalePayloadDto } from './dto/sync-sale-payload.dto';
import { SyncPullDto } from './dto/sync-pull.dto';
import { SyncPaymentPayloadDto } from './dto/sync-payment.dto';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

const MAX_PAYLOAD_BYTES = 64 * 1024;
const PENDING_ABANDON_MS = 5 * 60 * 1000;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = canonicalize((value as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return value;
}

function hashPayload(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonicalize(payload))).digest('hex');
}

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salesService: SalesService,
    private readonly cashService: CashService,
    private readonly config: ConfigService,
  ) {}

  async push(pharmacyId: string, userId: string, dto: SyncPushDto) {
    const minVersion = this.config.get<string>('minClientVersion') ?? '1.0.0';
    if (this.compareVersions(dto.appVersion, minVersion) < 0) {
      throw new UnprocessableEntityException({ code: 'CLIENT_VERSION_TOO_OLD', minVersion });
    }

    const client = await this.prisma.syncClient.findFirst({
      where: { clientId: dto.clientId, pharmacyId, status: 'ACTIVE' },
    });
    if (!client) throw new NotFoundException('Cliente nao encontrado ou suspenso.');

    const results: any[] = [];
    for (const op of dto.operations) {
      const payloadSize = Buffer.byteLength(JSON.stringify(op.payload), 'utf8');
      if (payloadSize > MAX_PAYLOAD_BYTES) {
        results.push({ idempotencyKey: op.idempotencyKey, status: 'REJECTED', rejectionCode: 'PAYLOAD_TOO_LARGE', rejectionReason: `Payload excede ${MAX_PAYLOAD_BYTES} bytes.` });
        continue;
      }
      if (op.operationType !== 'SALE' && op.operationType !== 'PAYMENT') {
        results.push({ idempotencyKey: op.idempotencyKey, status: 'REJECTED', rejectionCode: 'UNSUPPORTED_OPERATION', rejectionReason: 'Apenas SALE e PAYMENT sao suportados.' });
        continue;
      }

      let saleDto: SyncSalePayloadDto | null = null;
      let paymentDto: SyncPaymentPayloadDto | null = null;
      try {
        if (op.operationType === 'SALE') {
          saleDto = plainToInstance(SyncSalePayloadDto, op.payload);
          await validateOrReject(saleDto);
        } else {
          paymentDto = plainToInstance(SyncPaymentPayloadDto, op.payload);
          await validateOrReject(paymentDto);
        }
      } catch {
        results.push({ idempotencyKey: op.idempotencyKey, status: 'REJECTED', rejectionCode: 'INVALID_PAYLOAD', rejectionReason: 'Payload invalido.' });
        continue;
      }

      const incomingHash = hashPayload(op.payload);
      const attemptId = randomUUID();

      let operationId: string | null = null;
      try {
        const created = await this.prisma.syncOperation.create({
          data: {
            pharmacyId,
            syncClientId: client.id,
            appVersion: dto.appVersion,
            operationType: op.operationType,
            idempotencyKey: op.idempotencyKey,
            payload: op.payload as Prisma.InputJsonValue,
            status: 'PENDING',
            processedAt: new Date(),
            attemptId,
          },
          select: { id: true },
        });
        operationId = created.id;
      } catch (e: any) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) {
          throw e;
        }
        const existing = await this.prisma.syncOperation.findUnique({
          where: { pharmacyId_idempotencyKey: { pharmacyId, idempotencyKey: op.idempotencyKey } },
        });
        if (!existing) {
          results.push({ idempotencyKey: op.idempotencyKey, status: 'REJECTED', rejectionCode: 'IDEMPOTENCY_RACE', rejectionReason: 'Corrida de idempotencia sem registo visivel.' });
          continue;
        }
        if (hashPayload(existing.payload) !== incomingHash) {
          results.push({ idempotencyKey: op.idempotencyKey, status: 'REJECTED', rejectionCode: 'IDEMPOTENCY_KEY_CONFLICT', rejectionReason: 'Chave reutilizada com conteudo diferente.' });
          continue;
        }
        if (existing.status !== 'PENDING') {
          results.push({ idempotencyKey: op.idempotencyKey, status: existing.status, result: existing.result, rejectionCode: existing.rejectionCode, rejectionReason: existing.rejectionReason });
          continue;
        }
        const cutoff = new Date(Date.now() - PENDING_ABANDON_MS);
        if (existing.processedAt !== null && existing.processedAt >= cutoff) {
          results.push({ idempotencyKey: op.idempotencyKey, status: 'PENDING', result: null, rejectionCode: null, rejectionReason: null });
          continue;
        }
        const claim = await this.prisma.syncOperation.updateMany({
          where: { id: existing.id, status: 'PENDING', processedAt: existing.processedAt, attemptId: existing.attemptId },
          data: { processedAt: new Date(), attemptId },
        });
        if (claim.count === 0) {
          results.push({ idempotencyKey: op.idempotencyKey, status: 'PENDING', result: null, rejectionCode: null, rejectionReason: null });
          continue;
        }
        operationId = existing.id;
      }

      const outcome = await withSyncOperationLock(this.prisma, pharmacyId, op.idempotencyKey, async (tx) => {
        const fence = await tx.syncOperation.findUnique({
          where: { id: operationId! },
          select: { attemptId: true, status: true, result: true, rejectionCode: true, rejectionReason: true },
        });
        if (!fence) {
          return { idempotencyKey: op.idempotencyKey, status: 'PENDING' as const, result: null, rejectionCode: null, rejectionReason: null };
        }
        if (fence.status !== 'PENDING') {
          return { idempotencyKey: op.idempotencyKey, status: fence.status, result: fence.result, rejectionCode: fence.rejectionCode, rejectionReason: fence.rejectionReason };
        }
        if (fence.attemptId !== attemptId) {
          return { idempotencyKey: op.idempotencyKey, status: 'PENDING' as const, result: null, rejectionCode: null, rejectionReason: null };
        }
        try {
          if (op.operationType === 'SALE') {
            const sale = await this.salesService.create(pharmacyId, userId, saleDto as any, tx);
            await this.salesService.confirm(pharmacyId, userId, sale.id, tx);
            const updated = await tx.syncOperation.updateMany({
              where: { id: operationId!, attemptId, status: 'PENDING' },
              data: { status: 'PROCESSED', result: { saleId: sale.id, status: 'CONFIRMED' } as Prisma.InputJsonValue, processedAt: new Date() },
            });
            if (updated.count === 0) {
              const reread = await tx.syncOperation.findUnique({ where: { id: operationId! }, select: { status: true, result: true, rejectionCode: true, rejectionReason: true } });
              return { idempotencyKey: op.idempotencyKey, status: reread?.status ?? 'PENDING', result: reread?.result ?? { saleId: sale.id, status: 'CONFIRMED' }, rejectionCode: reread?.rejectionCode ?? null, rejectionReason: reread?.rejectionReason ?? null };
            }
            return { idempotencyKey: op.idempotencyKey, status: 'PROCESSED' as const, result: { saleId: sale.id, status: 'CONFIRMED' }, rejectionCode: null, rejectionReason: null };
          } else {
            const payment = await this.cashService.createPayment(pharmacyId, userId, {
              saleId: paymentDto!.saleId,
              method: paymentDto!.method as any,
              amount: paymentDto!.amount,
              idempotencyKey: op.idempotencyKey,
            } as any, tx);
            const updated = await tx.syncOperation.updateMany({
              where: { id: operationId!, attemptId, status: 'PENDING' },
              data: { status: 'PROCESSED', result: { paymentId: payment.id, saleId: payment.saleId } as Prisma.InputJsonValue, processedAt: new Date() },
            });
            if (updated.count === 0) {
              const reread = await tx.syncOperation.findUnique({ where: { id: operationId! }, select: { status: true, result: true, rejectionCode: true, rejectionReason: true } });
              return { idempotencyKey: op.idempotencyKey, status: reread?.status ?? 'PENDING', result: reread?.result ?? { paymentId: payment.id, saleId: payment.saleId }, rejectionCode: reread?.rejectionCode ?? null, rejectionReason: reread?.rejectionReason ?? null };
            }
            return { idempotencyKey: op.idempotencyKey, status: 'PROCESSED' as const, result: { paymentId: payment.id, saleId: payment.saleId }, rejectionCode: null, rejectionReason: null };
          }
        } catch (error: any) {
          const isBusinessError = error instanceof BadRequestException || error instanceof NotFoundException;
          if (!isBusinessError) {
            // Erro de infra: forcar rollback total da transaccao. Nenhum efeito de negocio deve ficar persistido.
            throw error;
          }
          const message = error?.message || 'Erro desconhecido.';
          const isStockError = message.toLowerCase().includes('stock') || message.toLowerCase().includes('expiry') || message.toLowerCase().includes('insuficiente');
          const rejectionCode = isStockError ? 'STOCK_CONFLICT' : (op.operationType === 'PAYMENT' ? 'PAYMENT_FAILED' : 'SALE_FAILED');
          const status = isStockError ? 'CONFLICT' : 'REJECTED';
          await tx.syncOperation.updateMany({
            where: { id: operationId!, attemptId, status: 'PENDING' },
            data: { status: status as any, rejectionCode, rejectionReason: message, processedAt: new Date() },
          }).catch(() => undefined);
          return { idempotencyKey: op.idempotencyKey, status, rejectionCode, rejectionReason: message };
        }
      });
      results.push(outcome);
    }

    return { results };
  }
  async pull(pharmacyId: string, dto: SyncPullDto) {
    const client = await this.prisma.syncClient.findFirst({
      where: { clientId: dto.clientId, pharmacyId, status: 'ACTIVE' },
    });
    if (!client) throw new NotFoundException('Cliente nao encontrado ou suspenso.');

    let cursorSeq = BigInt(0);
    if (dto.cursor) {
      try {
        const decoded = Buffer.from(dto.cursor, 'base64').toString('utf8');
        if (!/^\d+$/.test(decoded)) throw new Error();
        cursorSeq = BigInt(decoded);
      } catch {
        throw new BadRequestException({ code: 'INVALID_CURSOR', message: 'Cursor invalido.' });
      }
    }

    const limit = dto.limit ?? 50;

    const checkpoint = await this.prisma.syncCheckpoint.findUnique({ where: { pharmacyId } });
    const safeMax = checkpoint?.lastCommittedSequence ?? BigInt(0);

    if (safeMax <= cursorSeq) {
      return { changes: [], nextCursor: null, hasMore: false };
    }

    const events = await this.prisma.outboxEvent.findMany({
      where: { pharmacyId, sequence: { gt: cursorSeq, lte: safeMax } },
      orderBy: { sequence: 'asc' },
      take: limit + 1,
    });

    const hasMore = events.length > limit;
    const page = hasMore ? events.slice(0, limit) : events;
    const nextCursor = page.length > 0
      ? Buffer.from(page[page.length - 1].sequence.toString()).toString('base64')
      : null;

    return {
      changes: page.map(e => ({ type: e.entityType, action: e.action, data: e.payload })),
      nextCursor,
      hasMore,
    };
  }

  async getOperation(pharmacyId: string, idempotencyKey: string, clientId: string) {
    const client = await this.prisma.syncClient.findFirst({
      where: { clientId, pharmacyId, status: 'ACTIVE' },
    });
    if (!client) throw new NotFoundException('Cliente nao encontrado ou suspenso.');

    const op = await this.prisma.syncOperation.findFirst({
      where: { pharmacyId, idempotencyKey, syncClientId: client.id },
      select: {
        idempotencyKey: true,
        status: true,
        result: true,
        rejectionCode: true,
        rejectionReason: true,
        createdAt: true,
        processedAt: true,
      },
    });
    if (!op) throw new NotFoundException('Operacao de sincronizacao nao encontrada.');

    return {
      idempotencyKey: op.idempotencyKey,
      status: op.status,
      result: op.result ?? null,
      rejectionCode: op.rejectionCode ?? null,
      rejectionReason: op.rejectionReason ?? null,
      createdAt: op.createdAt,
      processedAt: op.processedAt,
    };
  }
  private compareVersions(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] || 0) > (pb[i] || 0)) return 1;
      if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    }
    return 0;
  }
}