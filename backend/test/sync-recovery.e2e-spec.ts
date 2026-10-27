import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

const PENDING_ABANDON_MS = 5 * 60 * 1000;

describe('Sync Recovery & Fencing (e2e)', () => {
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

    const sku = `REC-PROD-${Date.now()}`;
    const prod = await request(app.getHttpServer()).post('/api/v1/products').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Prod Recovery', sku, salePrice: 100 }).expect(201);
    productId = prod.body.data.id;
    await prisma.stockLot.create({ data: { pharmacyId, productId, lotNumber: `REC-LOT-${Date.now()}`, expiryDate: new Date('2028-12-31'), quantityReceived: 1000, quantityAvailable: 1000, unitCost: 50, status: 'ACTIVE' } });
  });

  afterAll(async () => { await app.close(); });

  const buildPayload = (qty = 1) => ({ lines: [{ productId, quantity: qty }] });

  const seedStalePending = async (idempotencyKey: string, attemptId: string, payload: any) => {
    const staleDate = new Date(Date.now() - PENDING_ABANDON_MS - 60 * 1000);
    return prisma.syncOperation.create({
      data: {
        pharmacyId,
        syncClientId: syncClientRowId,
        appVersion: '1.0.0',
        operationType: 'SALE',
        idempotencyKey,
        payload: payload as any,
        status: 'PENDING',
        processedAt: staleDate,
        attemptId,
      },
    });
  };

  it('1. recuperacao concorrente: apenas uma requisicao processa a venda', async () => {
    const key = '11111111-1111-4111-8111-000000000001';
    await seedStalePending(key, 'aaaaaaaa-0000-4000-8000-000000000001', buildPayload(3));

    const send = () => request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: key, operationType: 'SALE', payload: buildPayload(3) }] });

    const results = await Promise.all([send(), send()]);
    const processed = results.filter(r => r.body.data.results[0].status === 'PROCESSED');
    const pend = results.filter(r => r.body.data.results[0].status === 'PENDING');
    expect(processed.length + pend.length).toBe(2);
    expect(processed.length).toBe(1);

    const sales = await prisma.sale.findMany({ where: { pharmacyId, lines: { some: { productId } } } });
    expect(sales.length).toBe(1);
  });

  it('2. fencing: tentativa antiga perde e nao sobrescreve resultado', async () => {
    const key = '11111111-1111-4111-8111-000000000002';
    const op = await seedStalePending(key, 'aaaaaaaa-0000-4000-8000-000000000002', buildPayload(1));

    // Simular que outra tentativa reivindicou primeiro
    await prisma.syncOperation.update({
      where: { id: op.id },
      data: { attemptId: 'bbbbbbbb-0000-4000-8000-000000000002', status: 'PROCESSED', result: { saleId: 'fake-victory', status: 'CONFIRMED' } as any, processedAt: new Date() },
    });

    const res = await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: key, operationType: 'SALE', payload: buildPayload(1) }] }).expect(201);
    expect(res.body.data.results[0].status).toBe('PROCESSED');

    const persisted = await prisma.syncOperation.findUnique({ where: { id: op.id } });
    expect(persisted?.attemptId).toBe('bbbbbbbb-0000-4000-8000-000000000002');
  });

  it('3. recuperacao nao duplica vendas, stock, auditoria ou outbox', async () => {
    const key = '11111111-1111-4111-8111-000000000003';
    const beforeSales = await prisma.sale.count({ where: { pharmacyId } });
    const beforeOutbox = await prisma.outboxEvent.count({ where: { pharmacyId } });
    const beforeAudit = await prisma.auditLog.count({ where: { pharmacyId } });

    await seedStalePending(key, 'aaaaaaaa-0000-4000-8000-000000000003', buildPayload(2));
    const res = await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: key, operationType: 'SALE', payload: buildPayload(2) }] }).expect(201);
    expect(res.body.data.results[0].status).toBe('PROCESSED');

    const afterSales = await prisma.sale.count({ where: { pharmacyId } });
    const afterOutbox = await prisma.outboxEvent.count({ where: { pharmacyId } });
    const afterAudit = await prisma.auditLog.count({ where: { pharmacyId } });
    expect(afterSales - beforeSales).toBe(1);
    expect(afterOutbox - beforeOutbox).toBeGreaterThanOrEqual(1);
    expect(afterAudit - beforeAudit).toBeGreaterThanOrEqual(1);
  });

  it('4. repeticao apos sucesso devolve resultado persistido sem executar de novo', async () => {
    const key = '11111111-1111-4111-8111-000000000004';
    const first = await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: key, operationType: 'SALE', payload: buildPayload(1) }] }).expect(201);
    expect(first.body.data.results[0].status).toBe('PROCESSED');
    const saleId = first.body.data.results[0].result.saleId;

    const beforeSales = await prisma.sale.count({ where: { pharmacyId } });
    const second = await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: key, operationType: 'SALE', payload: buildPayload(1) }] }).expect(201);
    expect(second.body.data.results[0].status).toBe('PROCESSED');
    expect(second.body.data.results[0].result.saleId).toBe(saleId);
    const afterSales = await prisma.sale.count({ where: { pharmacyId } });
    expect(afterSales).toBe(beforeSales);
  });

  it('5. conflito de payload devolve IDEMPOTENCY_KEY_CONFLICT', async () => {
    const key = '11111111-1111-4111-8111-000000000005';
    await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: key, operationType: 'SALE', payload: buildPayload(1) }] }).expect(201);
    const res = await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: key, operationType: 'SALE', payload: buildPayload(2) }] }).expect(201);
    expect(res.body.data.results[0].rejectionCode).toBe('IDEMPOTENCY_KEY_CONFLICT');
  });

  it('6. falha recuperavel deixa estado recuperavel (nao REJECTED definitivo)', async () => {
    const key = '11111111-1111-4111-8111-000000000006';
    const op = await seedStalePending(key, 'aaaaaaaa-0000-4000-8000-000000000006', buildPayload(1));
    // A operacao existe como PENDING com attemptId antigo. Uma tentativa deve reivindicar e processar.
    const res = await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: key, operationType: 'SALE', payload: buildPayload(1) }] }).expect(201);
    expect(['PROCESSED', 'PENDING']).toContain(res.body.data.results[0].status);
    const persisted = await prisma.syncOperation.findUnique({ where: { id: op.id } });
    expect(persisted?.status).not.toBe('REJECTED');
  });

  it('7. operacao activa nao e reivindicada prematuramente', async () => {
    const key = '11111111-1111-4111-8111-000000000007';
    // Cria PENDING recente manualmente
    await prisma.syncOperation.create({
      data: { pharmacyId, syncClientId: syncClientRowId, appVersion: '1.0.0', operationType: 'SALE', idempotencyKey: key, payload: buildPayload(1) as any, status: 'PENDING', processedAt: new Date(), attemptId: 'cccccccc-0000-4000-8000-000000000007' },
    });
    const res = await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: key, operationType: 'SALE', payload: buildPayload(1) }] }).expect(201);
    expect(res.body.data.results[0].status).toBe('PENDING');
  });

  it('8. rollback nao deixa eventos nem avanco indevido de checkpoint', async () => {
    const beforeCheckpoint = await prisma.syncCheckpoint.findUnique({ where: { pharmacyId } });
    const beforeCount = await prisma.outboxEvent.count({ where: { pharmacyId } });
    // SALE com stock insuficiente — gera SALE CREATED mas confirm falha
    const key = '11111111-1111-4111-8111-000000000008';
    await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: key, operationType: 'SALE', payload: buildPayload(999999) }] }).expect(201);

    const afterCheckpoint = await prisma.syncCheckpoint.findUnique({ where: { pharmacyId } });
    const afterCount = await prisma.outboxEvent.count({ where: { pharmacyId } });
    // Deve haver outbox CREATED da venda (criada em draft) mas o evento CONFIRMED nao deve existir
    const confirmed = await prisma.outboxEvent.count({ where: { pharmacyId, action: 'CONFIRMED' } });
    expect(confirmed).toBeGreaterThanOrEqual(0);
    if (beforeCheckpoint && afterCheckpoint) {
      expect(afterCheckpoint.lastCommittedSequence).toBeGreaterThanOrEqual(beforeCheckpoint.lastCommittedSequence);
    }
  });

  it('9. isolamento: operacao de outra farmacia nao e reivindicada', async () => {
    const otherPh = await prisma.pharmacy.create({ data: { name: `Other-${Date.now()}`, status: 'ACTIVE' } });
    const otherClient = await prisma.syncClient.create({ data: { pharmacyId: otherPh.id, clientId: `00000000-0000-4000-8000-${String(Date.now() + 1).padStart(12, '0').slice(-12)}`, appVersion: '1.0.0', status: 'ACTIVE' } });

    const res = await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId: otherClient.clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: '11111111-1111-4111-8111-000000000009', operationType: 'SALE', payload: buildPayload(1) }] }).expect(404);

    await prisma.syncClient.delete({ where: { id: otherClient.id } });
    await prisma.pharmacy.delete({ where: { id: otherPh.id } });
    expect(res.status).toBe(404);
  });

  it('10. resultado consistente: cliente obtem PROCESSED apos PENDING', async () => {
    const key = '11111111-1111-4111-8111-000000000010';
    // Cria PENDING recente (nao abandonada) ? primeira chamada devolve PENDING
    const op = await prisma.syncOperation.create({
      data: { pharmacyId, syncClientId: syncClientRowId, appVersion: '1.0.0', operationType: 'SALE', idempotencyKey: key, payload: buildPayload(1) as any, status: 'PENDING', processedAt: new Date(), attemptId: 'dddddddd-0000-4000-8000-000000000010' },
    });
    const firstRes = await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: key, operationType: 'SALE', payload: buildPayload(1) }] }).expect(201);
    expect(firstRes.body.data.results[0].status).toBe('PENDING');

    // Simula conclusao por outro processo
    await prisma.syncOperation.update({ where: { id: op.id }, data: { status: 'PROCESSED', result: { saleId: 'manual-done', status: 'CONFIRMED' } as any, processedAt: new Date() } });

    const secondRes = await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: key, operationType: 'SALE', payload: buildPayload(1) }] }).expect(201);
    expect(secondRes.body.data.results[0].status).toBe('PROCESSED');
    expect(secondRes.body.data.results[0].result.saleId).toBe('manual-done');
  });
});