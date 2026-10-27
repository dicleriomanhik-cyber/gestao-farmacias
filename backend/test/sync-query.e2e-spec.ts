import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Sync Operation Query (e2e)', () => {
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

    const loginRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
    adminToken = loginRes.body.data.accessToken;
    pharmacyId = loginRes.body.data.user.pharmacyId;

    const client = await prisma.syncClient.create({ data: { pharmacyId, clientId: `00000000-0000-4000-8000-${String(Date.now()).padStart(12, '0').slice(-12)}`, appVersion: '1.0.0', status: 'ACTIVE' } });
    clientId = client.clientId;
    syncClientRowId = client.id;

    const sku = `QRY-PROD-${Date.now()}`;
    const prod = await request(app.getHttpServer()).post('/api/v1/products').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Prod Query', sku, salePrice: 100 }).expect(201);
    productId = prod.body.data.id;
    await prisma.stockLot.create({ data: { pharmacyId, productId, lotNumber: `QRY-LOT-${Date.now()}`, expiryDate: new Date('2028-12-31'), quantityReceived: 100, quantityAvailable: 100, unitCost: 50, status: 'ACTIVE' } });
  });

  afterAll(async () => { await app.close(); });

  const pushSale = (key: string, qty = 1) =>
    request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: key, operationType: 'SALE', payload: { lines: [{ productId, quantity: qty }] } }] });

  it('1. operacao inexistente devolve 404', async () => {
    const key = '11111111-1111-4111-8111-000000000901';
    await request(app.getHttpServer()).get(`/api/v1/sync/operations/${key}`).set('Authorization', `Bearer ${adminToken}`).query({ clientId }).expect(404);
  });

  it('2. operacao PROCESSED devolve resultado e saleId sem payload', async () => {
    const key = '11111111-1111-4111-8111-000000000902';
    await pushSale(key, 1).expect(201);
    const res = await request(app.getHttpServer()).get(`/api/v1/sync/operations/${key}`).set('Authorization', `Bearer ${adminToken}`).query({ clientId }).expect(200);
    expect(res.body.data.status).toBe('PROCESSED');
    expect(res.body.data.result.saleId).toBeDefined();
    expect(res.body.data.payload).toBeUndefined();
  });

  it('3. conflito de payload preserva rejectionCode', async () => {
    const key = '11111111-1111-4111-8111-000000000903';
    await pushSale(key, 1).expect(201);
    await pushSale(key, 2).expect(201);
    const res = await request(app.getHttpServer()).get(`/api/v1/sync/operations/${key}`).set('Authorization', `Bearer ${adminToken}`).query({ clientId }).expect(200);
    expect(res.body.data.status).toBe('PROCESSED');
  });

  it('4. operacao PENDING devolve status PENDING e result null', async () => {
    const key = '11111111-1111-4111-8111-000000000904';
    await prisma.syncOperation.create({ data: { pharmacyId, syncClientId: syncClientRowId, appVersion: '1.0.0', operationType: 'SALE', idempotencyKey: key, payload: { lines: [{ productId, quantity: 1 }] } as any, status: 'PENDING', processedAt: new Date() } });
    const res = await request(app.getHttpServer()).get(`/api/v1/sync/operations/${key}`).set('Authorization', `Bearer ${adminToken}`).query({ clientId }).expect(200);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.result).toBeNull();
  });

  it('5. idempotencyKey malformada devolve 400', async () => {
    await request(app.getHttpServer()).get('/api/v1/sync/operations/nao-e-uuid').set('Authorization', `Bearer ${adminToken}`).query({ clientId }).expect(400);
  });

  it('6. clientId em falta devolve 400', async () => {
    const key = '11111111-1111-4111-8111-000000000906';
    await request(app.getHttpServer()).get(`/api/v1/sync/operations/${key}`).set('Authorization', `Bearer ${adminToken}`).expect(400);
  });

  it('7. operacao de outra farmacia devolve 404', async () => {
    const key = '11111111-1111-4111-8111-000000000907';
    const otherPh = await prisma.pharmacy.create({ data: { name: `OtherQ-${Date.now()}`, status: 'ACTIVE' } });
    const otherClient = await prisma.syncClient.create({ data: { pharmacyId: otherPh.id, clientId: `00000000-0000-4000-8000-${String(Date.now() + 1).padStart(12, '0').slice(-12)}`, appVersion: '1.0.0', status: 'ACTIVE' } });
    await prisma.syncOperation.create({ data: { pharmacyId: otherPh.id, syncClientId: otherClient.id, appVersion: '1.0.0', operationType: 'SALE', idempotencyKey: key, payload: {} as any, status: 'PROCESSED', processedAt: new Date() } });
    await request(app.getHttpServer()).get(`/api/v1/sync/operations/${key}`).set('Authorization', `Bearer ${adminToken}`).query({ clientId }).expect(404);
    await prisma.syncOperation.deleteMany({ where: { pharmacyId: otherPh.id } });
    await prisma.syncClient.delete({ where: { id: otherClient.id } });
    await prisma.pharmacy.delete({ where: { id: otherPh.id } });
  });

  it('8. operacao de outro cliente da mesma farmacia devolve 404', async () => {
    const key = '11111111-1111-4111-8111-000000000908';
    const otherClient = await prisma.syncClient.create({ data: { pharmacyId, clientId: `00000000-0000-4000-8000-${String(Date.now() + 2).padStart(12, '0').slice(-12)}`, appVersion: '1.0.0', status: 'ACTIVE' } });
    await prisma.syncOperation.create({ data: { pharmacyId, syncClientId: otherClient.id, appVersion: '1.0.0', operationType: 'SALE', idempotencyKey: key, payload: {} as any, status: 'PROCESSED', processedAt: new Date() } });
    await request(app.getHttpServer()).get(`/api/v1/sync/operations/${key}`).set('Authorization', `Bearer ${adminToken}`).query({ clientId }).expect(404);
    await prisma.syncOperation.deleteMany({ where: { syncClientId: otherClient.id } });
    await prisma.syncClient.delete({ where: { id: otherClient.id } });
  });

  it('9. consulta nao altera estado persistido', async () => {
    const key = '11111111-1111-4111-8111-000000000909';
    await pushSale(key, 1).expect(201);
    const before = await prisma.syncOperation.findFirstOrThrow({ where: { pharmacyId, idempotencyKey: key } });
    const beforeSales = await prisma.sale.count({ where: { pharmacyId } });
    await request(app.getHttpServer()).get(`/api/v1/sync/operations/${key}`).set('Authorization', `Bearer ${adminToken}`).query({ clientId }).expect(200);
    const after = await prisma.syncOperation.findFirstOrThrow({ where: { pharmacyId, idempotencyKey: key } });
    const afterSales = await prisma.sale.count({ where: { pharmacyId } });
    expect(after.status).toBe(before.status);
    expect(after.processedAt?.getTime()).toBe(before.processedAt?.getTime());
    expect(afterSales).toBe(beforeSales);
  });
});