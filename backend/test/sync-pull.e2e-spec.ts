import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Sync Pull (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let pharmacyId: string;
  let clientId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.syncClient.deleteMany({});
    await prisma.syncOperation.deleteMany({});
    await prisma.outboxEvent.deleteMany({});
    await prisma.syncCheckpoint.deleteMany({});
    const loginRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
    adminToken = loginRes.body.data.accessToken;
    pharmacyId = loginRes.body.data.user.pharmacyId;

    const client = await prisma.syncClient.create({ data: { pharmacyId, clientId: 'bfd66653-45f7-4466-b1bc-4fc5f9b27918', appVersion: '1.0.0', status: 'ACTIVE' } });
    clientId = client.clientId;
  });

  afterAll(async () => { await app.close(); });

  it('deve falhar sem cliente valido', async () => {
    await request(app.getHttpServer()).get('/api/v1/sync/pull').set('Authorization', `Bearer ${adminToken}`).query({ clientId: '11111111-1111-4111-8111-111111111111' }).expect(404);
  });

  it('deve devolver eventos iniciais e cursor', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/sync/pull').set('Authorization', `Bearer ${adminToken}`).query({ clientId, limit: 10 }).expect(200);
    expect(res.body.data.changes).toBeInstanceOf(Array);
    expect(res.body.data.nextCursor === null || typeof res.body.data.nextCursor === 'string').toBe(true);
  });

  it('deve falhar com cursor invalido', async () => {
    await request(app.getHttpServer()).get('/api/v1/sync/pull').set('Authorization', `Bearer ${adminToken}`).query({ clientId, cursor: 'abc-invalido' }).expect(400);
  });

  it('deve registar evento de produto criado e actualizado', async () => {
    const sku = `SYNC-OUTBOX-${Date.now()}`;
    const createRes = await request(app.getHttpServer()).post('/api/v1/products').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Prod Outbox', sku, salePrice: 100 }).expect(201);
    const productId = createRes.body.data.id;

    await request(app.getHttpServer()).patch(`/api/v1/products/${productId}`).set('Authorization', `Bearer ${adminToken}`).send({ salePrice: 150 }).expect(200);

    const events = await prisma.outboxEvent.findMany({ where: { pharmacyId, entityId: productId } });
    expect(events.length).toBe(2);
    expect(events.some(e => e.action === 'CREATED')).toBe(true);
    expect(events.some(e => e.action === 'UPDATED')).toBe(true);
  });

  it('deve paginar sem perder eventos e sem duplicar', async () => {
    const first = await request(app.getHttpServer()).get('/api/v1/sync/pull').set('Authorization', `Bearer ${adminToken}`).query({ clientId, limit: 1 }).expect(200);
    const allSeen = new Set<string>();
    let cursor = first.body.data.nextCursor;
    first.body.data.changes.forEach((c: any) => allSeen.add(c.data.id + '|' + c.action));
    while (cursor) {
      const next = await request(app.getHttpServer()).get('/api/v1/sync/pull').set('Authorization', `Bearer ${adminToken}`).query({ clientId, limit: 1, cursor }).expect(200);
      next.body.data.changes.forEach((c: any) => {
        const key = c.data.id + '|' + c.action;
        expect(allSeen.has(key)).toBe(false);
        allSeen.add(key);
      });
      cursor = next.body.data.hasMore ? next.body.data.nextCursor : null;
    }
    expect(allSeen.size).toBeGreaterThan(0);
  });
  it('deve isolar eventos entre farmacias', async () => {
    const phB = await prisma.pharmacy.create({ data: { name: 'Farmacia B Outbox', status: 'ACTIVE' } });
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`INSERT INTO "sync_checkpoints" ("pharmacyId", "lastCommittedSequence", "updatedAt") VALUES (${phB.id}::uuid, 0, NOW()) ON CONFLICT DO NOTHING`;
      const created = await tx.outboxEvent.create({ data: { pharmacyId: phB.id, entityType: 'PRODUCT', entityId: phB.id, action: 'CREATED', payload: { secret: 'B' } as any } });
      await tx.syncCheckpoint.update({ where: { pharmacyId: phB.id }, data: { lastCommittedSequence: created.sequence } });
    });
    const res = await request(app.getHttpServer()).get('/api/v1/sync/pull').set('Authorization', `Bearer ${adminToken}`).query({ clientId, limit: 100 }).expect(200);
    const leaked = res.body.data.changes.some((c: any) => c.data?.secret === 'B');
    expect(leaked).toBe(false);
    await prisma.outboxEvent.deleteMany({ where: { pharmacyId: phB.id } });
    await prisma.syncCheckpoint.deleteMany({ where: { pharmacyId: phB.id } });
    await prisma.pharmacy.delete({ where: { id: phB.id } });
  });

  it('nao deve gerar evento apos rollback de venda invalida', async () => {
    const before = await prisma.outboxEvent.count({ where: { pharmacyId, entityType: 'SALE' } });
    const products = await prisma.product.findMany({ where: { pharmacyId }, take: 1 });
    if (products.length === 0) return;
    const sku = `SYNC-ROLLBACK-${Date.now()}`;
    const prod = await request(app.getHttpServer()).post('/api/v1/products').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Prod Rollback', sku, salePrice: 100 }).expect(201);
    // Tentar confirmar sem stock ? erro
    const sale = await request(app.getHttpServer()).post('/api/v1/sales').set('Authorization', `Bearer ${adminToken}`).send({ lines: [{ productId: prod.body.data.id, quantity: 5 }] }).expect(201);
    await request(app.getHttpServer()).patch(`/api/v1/sales/${sale.body.data.id}/confirm`).set('Authorization', `Bearer ${adminToken}`).expect(400);
    const after = await prisma.outboxEvent.count({ where: { pharmacyId, entityType: 'SALE', entityId: sale.body.data.id, action: 'CONFIRMED' } });
    expect(after).toBe(0);
  });

  it('deve gerar evento de actualizacao de stock apos confirmacao de venda', async () => {
    const sku = `SYNC-STOCK-${Date.now()}`;
    const prod = await request(app.getHttpServer()).post('/api/v1/products').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Prod Stock', sku, salePrice: 100 }).expect(201);
    await prisma.stockLot.create({ data: { pharmacyId, productId: prod.body.data.id, lotNumber: `LOT-${Date.now()}`, expiryDate: new Date('2028-12-31'), quantityReceived: 10, quantityAvailable: 10, unitCost: 50, status: 'ACTIVE' } });
    const sale = await request(app.getHttpServer()).post('/api/v1/sales').set('Authorization', `Bearer ${adminToken}`).send({ lines: [{ productId: prod.body.data.id, quantity: 1 }] }).expect(201);
    await request(app.getHttpServer()).patch(`/api/v1/sales/${sale.body.data.id}/confirm`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    const events = await prisma.outboxEvent.findMany({ where: { pharmacyId, entityId: sale.body.data.id } });
    expect(events.some(e => e.action === 'CONFIRMED')).toBe(true);
  });
});