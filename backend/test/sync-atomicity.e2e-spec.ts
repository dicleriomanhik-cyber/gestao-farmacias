import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Sync Atomicity (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let pharmacyId: string;
  let clientId: string;
  let productId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const loginRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
    adminToken = loginRes.body.data.accessToken;
    pharmacyId = loginRes.body.data.user.pharmacyId;

    const client = await prisma.syncClient.upsert({
      where: { pharmacyId_clientId: { pharmacyId, clientId: '00000000-0000-4000-8000-00000000e045' } },
      update: {},
      create: { pharmacyId, clientId: '00000000-0000-4000-8000-00000000e045', appVersion: '1.0.0', status: 'ACTIVE' },
    });
    clientId = client.clientId;

    const sku = `ATOM04-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const prod = await request(app.getHttpServer()).post('/api/v1/products').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Atom04', sku, salePrice: 100 }).expect(201);
    productId = prod.body.data.id;
    await prisma.stockLot.create({ data: { pharmacyId, productId, lotNumber: `ATOM04-${Date.now()}`, expiryDate: new Date('2028-12-31'), quantityReceived: 1000, quantityAvailable: 1000, unitCost: 50, status: 'ACTIVE' } });

    const openRes = await request(app.getHttpServer()).post('/api/v1/cash/open').set('Authorization', `Bearer ${adminToken}`).send({ openingBalance: 10000 });
    if (openRes.status !== 201) {
      const cur = await prisma.cashSession.findFirst({ where: { pharmacyId, status: 'OPEN' } });
      if (!cur) throw new Error('Nao foi possivel abrir sessao de caixa');
    }
  });

  afterAll(async () => { await app.close(); });

  // Cenário 1 — falha ANTES da criacao da entidade de negocio.
  // Injecta um erro no `withSyncOperationLock` logo apos o fencing, antes de chamar o servico interno.
  it('1. falha antes da entidade: sem efeitos parciais (entidade, Outbox, Audit, checkpoint)', async () => {
    const key = randomUUID();
    const beforeOutbox = await prisma.outboxEvent.count({ where: { pharmacyId } });
    const beforeSales = await prisma.sale.count({ where: { pharmacyId } });
    const beforeAuditPayment = await prisma.auditLog.count({ where: { pharmacyId, action: 'payment.create' } });
    const beforeCheckpoint = await prisma.syncCheckpoint.findUnique({ where: { pharmacyId } });

    // Sonda: forcar erro no findByUnico do fencing (findUnique com select attemptId/status)
    // O updateMany do SyncOperation nunca deve ser chamado; o erro sobe como 500.
    const originalTransaction = (prisma as any).$transaction.bind(prisma);
    let injected = false;
    (prisma as any).$transaction = async function (fn: any, ...rest: any[]) {
      if (typeof fn === 'function' && !injected) {
        return originalTransaction(async (tx: any) => {
          const origFU = tx.syncOperation.findUnique.bind(tx.syncOperation);
          tx.syncOperation.findUnique = async function (args: any) {
            if (!injected && args?.select?.attemptId === true) {
              injected = true;
              throw new Error('AUDIT_PRE_ENTITY_FAULT');
            }
            return origFU(args);
          };
          return fn(tx);
        }, ...rest);
      }
      return originalTransaction(fn, ...rest);
    };

    let status = 0;
    try {
      const res = await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
        .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: key, operationType: 'PAYMENT', payload: { saleId: randomUUID(), method: 'CASH', amount: 100, idempotencyKey: key } }] });
      status = res.status;
    } finally {
      (prisma as any).$transaction = originalTransaction;
    }

    expect(injected).toBe(true);

    const afterOutbox = await prisma.outboxEvent.count({ where: { pharmacyId } });
    const afterSales = await prisma.sale.count({ where: { pharmacyId } });
    const afterAuditPayment = await prisma.auditLog.count({ where: { pharmacyId, action: 'payment.create' } });
    const afterCheckpoint = await prisma.syncCheckpoint.findUnique({ where: { pharmacyId } });
    const op = await prisma.syncOperation.findFirst({ where: { pharmacyId, idempotencyKey: key } });

    console.log('PRE_ENTITY:', JSON.stringify({
      status,
      outboxDelta: afterOutbox - beforeOutbox,
      salesDelta: afterSales - beforeSales,
      auditDelta: afterAuditPayment - beforeAuditPayment,
      checkpointBefore: beforeCheckpoint?.lastCommittedSequence?.toString() ?? null,
      checkpointAfter: afterCheckpoint?.lastCommittedSequence?.toString() ?? null,
      syncStatus: op?.status ?? null,
    }));

    expect(afterOutbox).toBe(beforeOutbox);
    expect(afterSales).toBe(beforeSales);
    expect(afterAuditPayment).toBe(beforeAuditPayment);
    expect(afterCheckpoint?.lastCommittedSequence.toString()).toBe(beforeCheckpoint?.lastCommittedSequence.toString());
    expect(op?.status).not.toBe('PROCESSED');
  });

  // Cenário 2 — falha durante o checkpoint.
  // Injecta erro no `SyncCheckpoint.update` chamado por `emitOutboxEvent`.
  // Nota: `emitOutboxEvent` corre dentro de `createPayment` (com tx), portanto o rollback deve ser integral.
  it('2. falha durante checkpoint: rollback coerente de entidade, Audit, Outbox, SyncOperation', async () => {
    // Criar Sale confirmada para PAYMENT
    const sale = await request(app.getHttpServer()).post('/api/v1/sales').set('Authorization', `Bearer ${adminToken}`).send({ lines: [{ productId, quantity: 1 }] }).expect(201);
    await request(app.getHttpServer()).patch(`/api/v1/sales/${sale.body.data.id}/confirm`).set('Authorization', `Bearer ${adminToken}`).expect(200);

    const key = randomUUID();
    const beforeOutboxSP = await prisma.outboxEvent.count({ where: { pharmacyId, entityType: 'SALE_PAYMENT' } });
    const beforeAudit = await prisma.auditLog.count({ where: { pharmacyId, action: 'payment.create' } });
    const beforeCheckpoint = await prisma.syncCheckpoint.findUnique({ where: { pharmacyId } });

    const originalTransaction = (prisma as any).$transaction.bind(prisma);
    let injected = false;
    (prisma as any).$transaction = async function (fn: any, ...rest: any[]) {
      if (typeof fn === 'function') {
        return originalTransaction(async (tx: any) => {
          const origUpdate = tx.syncCheckpoint.update.bind(tx.syncCheckpoint);
          tx.syncCheckpoint.update = async function (args: any) {
            if (!injected) {
              injected = true;
              throw new Error('AUDIT_CHECKPOINT_FAULT');
            }
            return origUpdate(args);
          };
          return fn(tx);
        }, ...rest);
      }
      return originalTransaction(fn, ...rest);
    };

    let status = 0;
    try {
      const res = await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
        .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: key, operationType: 'PAYMENT', payload: { saleId: sale.body.data.id, method: 'CASH', amount: 100, idempotencyKey: key } }] });
      status = res.status;
    } finally {
      (prisma as any).$transaction = originalTransaction;
    }

    expect(injected).toBe(true);

    const payments = await prisma.salePayment.findMany({ where: { saleId: sale.body.data.id } });
    const afterOutboxSP = await prisma.outboxEvent.count({ where: { pharmacyId, entityType: 'SALE_PAYMENT' } });
    const afterAudit = await prisma.auditLog.count({ where: { pharmacyId, action: 'payment.create' } });
    const afterCheckpoint = await prisma.syncCheckpoint.findUnique({ where: { pharmacyId } });
    const op = await prisma.syncOperation.findFirst({ where: { pharmacyId, idempotencyKey: key } });

    console.log('CHECKPOINT_FAULT:', JSON.stringify({
      status,
      payments: payments.length,
      outboxSPDelta: afterOutboxSP - beforeOutboxSP,
      auditDelta: afterAudit - beforeAudit,
      checkpointBefore: beforeCheckpoint?.lastCommittedSequence?.toString() ?? null,
      checkpointAfter: afterCheckpoint?.lastCommittedSequence?.toString() ?? null,
      syncStatus: op?.status ?? null,
    }));

    expect(payments.length).toBe(0);
    expect(afterOutboxSP).toBe(beforeOutboxSP);
    expect(afterAudit).toBe(beforeAudit);
    expect(afterCheckpoint?.lastCommittedSequence.toString()).toBe(beforeCheckpoint?.lastCommittedSequence.toString());
    expect(op?.status).not.toBe('PROCESSED');
  });

  // Cenário 3 — Pull so ve SALE_PAYMENT depois do commit.
  // 3a: durante falha (rollback) o Pull nao ve o SALE_PAYMENT.
  // 3b: sucesso -> Pull ve.
  it('3. Pull so expoe SALE_PAYMENT apos commit confirmado', async () => {
    const sale = await request(app.getHttpServer()).post('/api/v1/sales').set('Authorization', `Bearer ${adminToken}`).send({ lines: [{ productId, quantity: 1 }] }).expect(201);
    await request(app.getHttpServer()).patch(`/api/v1/sales/${sale.body.data.id}/confirm`).set('Authorization', `Bearer ${adminToken}`).expect(200);

    // Baseline: Pull atual
    const pull0 = await request(app.getHttpServer()).get('/api/v1/sync/pull').set('Authorization', `Bearer ${adminToken}`).query({ clientId, limit: 100 }).expect(200);
    const baselineNext = pull0.body.data.nextCursor;

    // Fase 3a: push falha no updateMany final. Pull nao deve ter SALE_PAYMENT desta tentativa.
    const keyFail = randomUUID();
    const originalTransaction = (prisma as any).$transaction.bind(prisma);
    let failInjected = false;
    (prisma as any).$transaction = async function (fn: any, ...rest: any[]) {
      if (typeof fn === 'function') {
        return originalTransaction(async (tx: any) => {
          const origUM = tx.syncOperation.updateMany.bind(tx.syncOperation);
          tx.syncOperation.updateMany = async function (args: any) {
            if (!failInjected && args?.data?.status === 'PROCESSED' && args?.data?.result?.paymentId) {
              failInjected = true;
              throw new Error('AUDIT_PULL_FAULT');
            }
            return origUM(args);
          };
          return fn(tx);
        }, ...rest);
      }
      return originalTransaction(fn, ...rest);
    };
    try {
      await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
        .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: keyFail, operationType: 'PAYMENT', payload: { saleId: sale.body.data.id, method: 'CASH', amount: 50, idempotencyKey: keyFail } }] });
    } finally {
      (prisma as any).$transaction = originalTransaction;
    }
    expect(failInjected).toBe(true);

    const pullAfterFail = await request(app.getHttpServer()).get('/api/v1/sync/pull').set('Authorization', `Bearer ${adminToken}`).query({ clientId, limit: 100, cursor: baselineNext ?? undefined }).expect(200);
    const paymentsFromFailedTx = await prisma.salePayment.findMany({ where: { saleId: sale.body.data.id } });
    expect(paymentsFromFailedTx.length).toBe(0);
    const spInFailedPull = pullAfterFail.body.data.changes.some((c: any) => c.type === 'SALE_PAYMENT' && c.data?.saleId === sale.body.data.id);
    expect(spInFailedPull).toBe(false);

    // Fase 3b: push com sucesso. Pull deve devolver.
    const keyOk = randomUUID();
    const okRes = await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: keyOk, operationType: 'PAYMENT', payload: { saleId: sale.body.data.id, method: 'CASH', amount: 50, idempotencyKey: keyOk } }] }).expect(201);
    expect(okRes.body.data.results[0].status).toBe('PROCESSED');
    const pid = okRes.body.data.results[0].result.paymentId;

    const pullAfterSuccess = await request(app.getHttpServer()).get('/api/v1/sync/pull').set('Authorization', `Bearer ${adminToken}`).query({ clientId, limit: 100, cursor: baselineNext ?? undefined }).expect(200);
    const spInPull = pullAfterSuccess.body.data.changes.find((c: any) => c.type === 'SALE_PAYMENT' && c.data?.id === pid);
    expect(spInPull).toBeDefined();
  });
});