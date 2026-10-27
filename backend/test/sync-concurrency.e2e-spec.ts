import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { withSyncOperationLock } from '../src/modules/sync/operation-lock.helper';

describe('Sync Concurrency Real (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let pharmacyId: string;
  let clientId: string;
  let syncClientRowId: string;
  let productId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.syncOperation.deleteMany({});
    await prisma.syncClient.deleteMany({});
    await prisma.outboxEvent.deleteMany({});
    await prisma.syncCheckpoint.deleteMany({});

    const loginRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
    adminToken = loginRes.body.data.accessToken;
    pharmacyId = loginRes.body.data.user.pharmacyId;

    const client = await prisma.syncClient.create({ data: { pharmacyId, clientId: `00000000-0000-4000-8000-${String(Date.now()).padStart(12, '0').slice(-12)}`, appVersion: '1.0.0', status: 'ACTIVE' } });
    clientId = client.clientId;
    syncClientRowId = client.id;

    const sku = `CONC-PROD-${Date.now()}`;
    const prod = await request(app.getHttpServer()).post('/api/v1/products').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Prod Concurrency', sku, salePrice: 100 }).expect(201);
    productId = prod.body.data.id;
    await prisma.stockLot.create({ data: { pharmacyId, productId, lotNumber: `CONC-LOT-${Date.now()}`, expiryDate: new Date('2028-12-31'), quantityReceived: 500, quantityAvailable: 500, unitCost: 50, status: 'ACTIVE' } });
  });

  afterAll(async () => { await app.close(); });

  it('corrida real: A detem o lock, B bloqueia e devolve o resultado de A sem duplicar', async () => {
    const key = '11111111-1111-4111-8111-aaaaaaaaaaaa';
    const payload = { lines: [{ productId, quantity: 1 }] };

    const staleDate = new Date(Date.now() - 6 * 60 * 1000);
    const attemptA = 'aaaa0000-0000-4000-8000-000000000aaa';
    const op = await prisma.syncOperation.create({
      data: { pharmacyId, syncClientId: syncClientRowId, appVersion: '1.0.0', operationType: 'SALE', idempotencyKey: key, payload: payload as any, status: 'PENDING', processedAt: staleDate, attemptId: attemptA },
    });

    let aHeldLock = false;
    let aFinishedAt = 0;
    let bStartedAt = 0;
    let bFinishedAt = 0;

    const aWork = withSyncOperationLock(prisma, pharmacyId, key, async (tx) => {
      aHeldLock = true;
      const user = await prisma.user.findFirstOrThrow({ where: { pharmacyId } });
      const sale = await tx.sale.create({
        data: { pharmacyId, userId: user.id, saleNumber: `CONC-A-${Date.now()}`, status: 'CONFIRMED', subtotal: 100, discount: 0, total: 100, lines: { create: [{ productId, quantity: 1, unitPrice: 100, discount: 0, subtotal: 100 }] } },
      });
      await tx.syncOperation.update({ where: { id: op.id }, data: { status: 'PROCESSED', result: { saleId: sale.id, status: 'CONFIRMED' } as any, processedAt: new Date(), attemptId: attemptA } });
      await new Promise((r) => setTimeout(r, 500));
      aFinishedAt = Date.now();
      return sale.id;
    });

    const bWork = (async () => {
      while (!aHeldLock) await new Promise((r) => setTimeout(r, 5));
      bStartedAt = Date.now();
      const res = await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
        .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: key, operationType: 'SALE', payload }] }).expect(201);
      bFinishedAt = Date.now();
      return res;
    })();

    const [saleIdA, bRes] = await Promise.all([aWork, bWork]);

    expect(saleIdA).toBeDefined();
    expect(bFinishedAt).toBeGreaterThanOrEqual(aFinishedAt);
    expect(bFinishedAt - bStartedAt).toBeGreaterThanOrEqual(400);

    expect(bRes.body.data.results[0].status).toBe('PROCESSED');
    expect(bRes.body.data.results[0].result.saleId).toBe(saleIdA);

    const sales = await prisma.sale.findMany({ where: { pharmacyId, lines: { some: { productId } } } });
    expect(sales.length).toBe(1);
    const persisted = await prisma.syncOperation.findUniqueOrThrow({ where: { id: op.id } });
    expect(persisted.status).toBe('PROCESSED');
    expect(persisted.attemptId).toBe(attemptA);
    expect((persisted.result as any).saleId).toBe(saleIdA);
  }, 15000);
});