import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('AUDIT-05.4 — atomicity regression (SALE + PAYMENT)', () => {
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
      where: { pharmacyId_clientId: { pharmacyId, clientId: '00000000-0000-4000-8000-00000000c040' } },
      update: {},
      create: { pharmacyId, clientId: '00000000-0000-4000-8000-00000000c040', appVersion: '1.0.0', status: 'ACTIVE' },
    });
    clientId = client.clientId;

    const sku = `AUD04C-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const prod = await request(app.getHttpServer()).post('/api/v1/products').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Audit04C', sku, salePrice: 100 }).expect(201);
    productId = prod.body.data.id;
    await prisma.stockLot.create({ data: { pharmacyId, productId, lotNumber: `AUD04C-${Date.now()}`, expiryDate: new Date('2028-12-31'), quantityReceived: 1000, quantityAvailable: 1000, unitCost: 50, status: 'ACTIVE' } });

    const openRes = await request(app.getHttpServer()).post('/api/v1/cash/open').set('Authorization', `Bearer ${adminToken}`).send({ openingBalance: 10000 });
    if (openRes.status !== 201) {
      const cur = await prisma.cashSession.findFirst({ where: { pharmacyId, status: 'OPEN' } });
      if (!cur) throw new Error('Nao foi possivel abrir sessao de caixa');
    }
  });

  afterAll(async () => { await app.close(); });

  const injectFault = (matcher: (args: any) => boolean) => {
    let patched = false;
    const original = (prisma as any).$transaction.bind(prisma);
    (prisma as any).$transaction = async function (fn: any, ...rest: any[]) {
      if (typeof fn === 'function') {
        return original(async (tx: any) => {
          const origUM = tx.syncOperation.updateMany.bind(tx.syncOperation);
          tx.syncOperation.updateMany = async function (args: any) {
            if (!patched && args?.data?.status === 'PROCESSED' && matcher(args)) {
              patched = true;
              throw new Error('AUDIT_FAULT_INJECTED_AT_SYNC_COMMIT');
            }
            return origUM(args);
          };
          return fn(tx);
        }, ...rest);
      }
      return original(fn, ...rest);
    };
    return {
      wasPatched: () => patched,
      restore: () => { (prisma as any).$transaction = original; },
    };
  };

  it('PAYMENT: falha no updateMany final provoca rollback integral', async () => {
    const sale = await request(app.getHttpServer()).post('/api/v1/sales').set('Authorization', `Bearer ${adminToken}`).send({ lines: [{ productId, quantity: 1 }] }).expect(201);
    await request(app.getHttpServer()).patch(`/api/v1/sales/${sale.body.data.id}/confirm`).set('Authorization', `Bearer ${adminToken}`).expect(200);

    const key = randomUUID();
    const beforeAuditPayment = await prisma.auditLog.count({ where: { pharmacyId, action: 'payment.create' } });
    const injection = injectFault((args) => !!args?.data?.result?.paymentId);

    let pushResult: any;
    try {
      const res = await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
        .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: key, operationType: 'PAYMENT', payload: { saleId: sale.body.data.id, method: 'CASH', amount: 100, idempotencyKey: key } }] });
      pushResult = res.body;
    } finally {
      injection.restore();
    }

    console.log('PAYMENT_PUSH_RESULT:', JSON.stringify(pushResult));
    expect(injection.wasPatched()).toBe(true);

    const payments = await prisma.salePayment.findMany({ where: { saleId: sale.body.data.id } });
    const outbox = await prisma.outboxEvent.count({ where: { pharmacyId, entityType: 'SALE_PAYMENT', entityId: { in: payments.map(p => p.id) } } });
    const afterAuditPayment = await prisma.auditLog.count({ where: { pharmacyId, action: 'payment.create' } });
    const op = await prisma.syncOperation.findFirst({ where: { pharmacyId, idempotencyKey: key } });

    const snapshot = { payments: payments.length, outbox, auditDelta: afterAuditPayment - beforeAuditPayment, syncStatus: op?.status ?? null, syncExists: !!op };
    console.log('PAYMENT_SNAPSHOT:', JSON.stringify(snapshot));

    expect(payments.length).toBe(0);
    expect(outbox).toBe(0);
    expect(afterAuditPayment - beforeAuditPayment).toBe(0);
    expect(op?.status).not.toBe('PROCESSED');
  });

  it('SALE: falha no updateMany final provoca rollback integral', async () => {
    const key = randomUUID();
    const beforeSales = await prisma.sale.count({ where: { pharmacyId } });
    const beforeOutboxSale = await prisma.outboxEvent.count({ where: { pharmacyId, entityType: 'SALE' } });
    const beforeAuditSale = await prisma.auditLog.count({ where: { pharmacyId, action: { in: ['sale.create', 'sale.confirm'] } } });

    const injection = injectFault((args) => !!args?.data?.result?.saleId);

    let pushResult: any;
    try {
      const res = await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
        .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: key, operationType: 'SALE', payload: { lines: [{ productId, quantity: 1 }] } }] });
      pushResult = res.body;
    } finally {
      injection.restore();
    }

    console.log('SALE_PUSH_RESULT:', JSON.stringify(pushResult));
    expect(injection.wasPatched()).toBe(true);

    const afterSales = await prisma.sale.count({ where: { pharmacyId } });
    const afterOutboxSale = await prisma.outboxEvent.count({ where: { pharmacyId, entityType: 'SALE' } });
    const afterAuditSale = await prisma.auditLog.count({ where: { pharmacyId, action: { in: ['sale.create', 'sale.confirm'] } } });
    const op = await prisma.syncOperation.findFirst({ where: { pharmacyId, idempotencyKey: key } });

    console.log('SALE_SNAPSHOT:', JSON.stringify({ before: { s: beforeSales, o: beforeOutboxSale, a: beforeAuditSale }, after: { s: afterSales, o: afterOutboxSale, a: afterAuditSale }, syncStatus: op?.status ?? null }));

    expect(afterSales).toBe(beforeSales);
    expect(afterOutboxSale).toBe(beforeOutboxSale);
    expect(afterAuditSale).toBe(beforeAuditSale);
    expect(op?.status).not.toBe('PROCESSED');
  });
});