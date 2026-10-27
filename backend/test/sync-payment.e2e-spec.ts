import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Sync Payment (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let pharmacyId: string;
  let clientId: string;
  let syncClientRowId: string;
  let productId: string;
  let saleId: string;
  let cashSessionId: string;

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
    await prisma.salePayment.deleteMany({});
    await prisma.cashMovement.deleteMany({});
    await prisma.cashSession.deleteMany({});

    const loginRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
    adminToken = loginRes.body.data.accessToken;
    pharmacyId = loginRes.body.data.user.pharmacyId;

    const client = await prisma.syncClient.create({ data: { pharmacyId, clientId: `00000000-0000-4000-8000-${String(Date.now()).padStart(12, '0').slice(-12)}`, appVersion: '1.0.0', status: 'ACTIVE' } });
    clientId = client.clientId;
    syncClientRowId = client.id;

    const sku = `PAY-PROD-${Date.now()}`;
    const prod = await request(app.getHttpServer()).post('/api/v1/products').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Prod Payment', sku, salePrice: 100 }).expect(201);
    productId = prod.body.data.id;
    await prisma.stockLot.create({ data: { pharmacyId, productId, lotNumber: `PAY-LOT-${Date.now()}`, expiryDate: new Date('2028-12-31'), quantityReceived: 10000, quantityAvailable: 10000, unitCost: 50, status: 'ACTIVE' } });
  });

  afterAll(async () => { await app.close(); });

  const openSession = async () => {
    if (cashSessionId) {
      const cur = await prisma.cashSession.findUnique({ where: { id: cashSessionId } });
      if (cur && cur.status === 'OPEN') return cashSessionId;
    }
    const res = await request(app.getHttpServer()).post('/api/v1/cash/open').set('Authorization', `Bearer ${adminToken}`).send({ openingBalance: 1000 }).expect(201);
    cashSessionId = res.body.data.id;
    return cashSessionId;
  };

  const createConfirmedSale = async (qty = 1): Promise<string> => {
    const sale = await request(app.getHttpServer()).post('/api/v1/sales').set('Authorization', `Bearer ${adminToken}`).send({ lines: [{ productId, quantity: qty }] }).expect(201);
    await request(app.getHttpServer()).patch(`/api/v1/sales/${sale.body.data.id}/confirm`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    return sale.body.data.id;
  };

  const pushPayment = (key: string, saleId: string, amount: number, method: string) =>
    request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: key, operationType: 'PAYMENT', payload: { saleId, method, amount, idempotencyKey: key } }] });

  const uuid = (n: number) => `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`;

  it('1. PAYMENT CASH via push', async () => {
    await openSession();
    const sid = await createConfirmedSale(1);
    const r = await pushPayment(uuid(1), sid, 100, 'CASH').expect(201);
    expect(r.body.data.results[0].status).toBe('PROCESSED');
    expect(r.body.data.results[0].result.paymentId).toBeDefined();
  });

  it('2. PAYMENT CARD via push', async () => {
    await openSession();
    const sid = await createConfirmedSale(1);
    const r = await pushPayment(uuid(2), sid, 50, 'CARD').expect(201);
    expect(r.body.data.results[0].status).toBe('PROCESSED');
  });

  it('3. PAYMENT MPESA via push', async () => {
    await openSession();
    const sid = await createConfirmedSale(1);
    const r = await pushPayment(uuid(3), sid, 30, 'MPESA').expect(201);
    expect(r.body.data.results[0].status).toBe('PROCESSED');
  });

  it('4. PAYMENT EMOLA via push', async () => {
    await openSession();
    const sid = await createConfirmedSale(1);
    const r = await pushPayment(uuid(4), sid, 30, 'EMOLA').expect(201);
    expect(r.body.data.results[0].status).toBe('PROCESSED');
  });

  it('5. PAYMENT TRANSFER via push', async () => {
    await openSession();
    const sid = await createConfirmedSale(1);
    const r = await pushPayment(uuid(5), sid, 20, 'TRANSFER').expect(201);
    expect(r.body.data.results[0].status).toBe('PROCESSED');
  });

  it('6. Retry apos timeout com a mesma chave -> um unico SalePayment', async () => {
    await openSession();
    const sid = await createConfirmedSale(1);
    const key = uuid(6);
    const r1 = await pushPayment(key, sid, 100, 'CASH').expect(201);
    const r2 = await pushPayment(key, sid, 100, 'CASH').expect(201);
    expect(r1.body.data.results[0].result.paymentId).toBe(r2.body.data.results[0].result.paymentId);
    const count = await prisma.salePayment.count({ where: { idempotencyKey: key } });
    expect(count).toBe(1);
  });

  it('7. Dois push concorrentes -> um unico SalePayment', async () => {
    await openSession();
    const sid = await createConfirmedSale(1);
    const key = uuid(7);
    const [a, b] = await Promise.all([pushPayment(key, sid, 100, 'CASH'), pushPayment(key, sid, 100, 'CASH')]);
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    const count = await prisma.salePayment.count({ where: { idempotencyKey: key } });
    expect(count).toBe(1);
  });

  it('8. Pagamento para DRAFT -> REJECTED', async () => {
    await openSession();
    const sale = await request(app.getHttpServer()).post('/api/v1/sales').set('Authorization', `Bearer ${adminToken}`).send({ lines: [{ productId, quantity: 1 }] }).expect(201);
    const r = await pushPayment(uuid(8), sale.body.data.id, 100, 'CASH').expect(201);
    expect(r.body.data.results[0].status).toBe('REJECTED');
  });

  it('9. saleId inexistente -> REJECTED', async () => {
    await openSession();
    const r = await pushPayment(uuid(9), '99999999-9999-4999-8999-999999999999', 100, 'CASH').expect(201);
    expect(r.body.data.results[0].status).toBe('REJECTED');
  });

  it('10. saleId de outra farmacia -> REJECTED', async () => {
    await openSession();
    const otherPh = await prisma.pharmacy.create({ data: { name: `PAY-OTH-${Date.now()}`, status: 'ACTIVE' } });
    const otherUser = await prisma.user.findFirstOrThrow({ where: { pharmacyId } });
    const otherSale = await prisma.sale.create({ data: { pharmacyId: otherPh.id, userId: otherUser.id, saleNumber: `OTH-${Date.now()}`, status: 'CONFIRMED', subtotal: 100, discount: 0, total: 100 } });
    const r = await pushPayment(uuid(10), otherSale.id, 100, 'CASH').expect(201);
    expect(r.body.data.results[0].status).toBe('REJECTED');
    await prisma.sale.delete({ where: { id: otherSale.id } });
    await prisma.pharmacy.delete({ where: { id: otherPh.id } });
  });

  it('11. Mesmo idempotencyKey apos sucesso -> mesmo paymentId', async () => {
    await openSession();
    const sid = await createConfirmedSale(1);
    const key = uuid(11);
    const a = await pushPayment(key, sid, 100, 'CASH').expect(201);
    const b = await pushPayment(key, sid, 100, 'CASH').expect(201);
    expect(a.body.data.results[0].result.paymentId).toBe(b.body.data.results[0].result.paymentId);
  });

  it('12. Payload diferente com mesma chave -> IDEMPOTENCY_KEY_CONFLICT', async () => {
    await openSession();
    const sid = await createConfirmedSale(1);
    const key = uuid(12);
    await pushPayment(key, sid, 50, 'CASH').expect(201);
    const r = await pushPayment(key, sid, 100, 'CASH').expect(201);
    expect(r.body.data.results[0].rejectionCode).toBe('IDEMPOTENCY_KEY_CONFLICT');
  });

  it('13. amount > pendingAmount -> REJECTED', async () => {
    await openSession();
    const sid = await createConfirmedSale(1);
    const r = await pushPayment(uuid(13), sid, 999999, 'CASH').expect(201);
    expect(r.body.data.results[0].status).toBe('REJECTED');
  });

  it('14. Ausencia de sessao aberta -> REJECTED', async () => {
    const cur = await prisma.cashSession.findFirst({ where: { pharmacyId, status: 'OPEN' } });
    if (cur) {
      await request(app.getHttpServer()).patch(`/api/v1/cash/${cur.id}/close`).set('Authorization', `Bearer ${adminToken}`).send({ countedBalance: 0 }).expect(200);
    }
    const sid = await createConfirmedSale(1);
    const r = await pushPayment(uuid(14), sid, 100, 'CASH').expect(201);
    expect(r.body.data.results[0].status).toBe('REJECTED');
  });

  it('15. Nenhum CashMovement adicional e criado', async () => {
    await openSession();
    const before = await prisma.cashMovement.count({ where: { cashSession: { pharmacyId } } });
    const sid = await createConfirmedSale(1);
    await pushPayment(uuid(15), sid, 100, 'CASH').expect(201);
    const after = await prisma.cashMovement.count({ where: { cashSession: { pharmacyId } } });
    expect(after).toBe(before);
  });

  it('16. Um pagamento gera exactamente um SALE_PAYMENT / CREATED', async () => {
    await openSession();
    const sid = await createConfirmedSale(1);
    const key = uuid(16);
    const r = await pushPayment(key, sid, 100, 'CASH').expect(201);
    const pid = r.body.data.results[0].result.paymentId;
    const count = await prisma.outboxEvent.count({
      where: { pharmacyId, entityType: 'SALE_PAYMENT', entityId: pid, action: 'CREATED' },
    });
    expect(count).toBe(1);
  });

  it('17. Rollback nao deixa pagamento nem OutboxEvent orfaos (pagamento rejeitado)', async () => {
    await openSession();
    const sid = await createConfirmedSale(1);
    const key = uuid(17);
    const before = await prisma.outboxEvent.count({ where: { pharmacyId, entityType: 'SALE_PAYMENT' } });
    const r = await pushPayment(key, sid, 999999, 'CASH').expect(201);
    expect(r.body.data.results[0].status).toBe('REJECTED');
    const after = await prisma.outboxEvent.count({ where: { pharmacyId, entityType: 'SALE_PAYMENT' } });
    expect(after).toBe(before);
  });

  it('18. Tenant isolation', async () => {
    await openSession();
    const otherPh = await prisma.pharmacy.create({ data: { name: `PAY-ISO-${Date.now()}`, status: 'ACTIVE' } });
    const otherClient = await prisma.syncClient.create({ data: { pharmacyId: otherPh.id, clientId: `00000000-0000-4000-8000-${String(Date.now() + 1).padStart(12, '0').slice(-12)}`, appVersion: '1.0.0', status: 'ACTIVE' } });
    const r = await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId: otherClient.clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: uuid(18), operationType: 'PAYMENT', payload: { saleId, method: 'CASH', amount: 10, idempotencyKey: uuid(18) } }] })
      .expect(404);
    expect(r.status).toBe(404);
    await prisma.syncClient.delete({ where: { id: otherClient.id } });
    await prisma.pharmacy.delete({ where: { id: otherPh.id } });
  });

  it('19. Pull devolve SALE_PAYMENT', async () => {
    await openSession();
    const sid = await createConfirmedSale(1);
    const key = uuid(19);
    await pushPayment(key, sid, 100, 'CASH').expect(201);
    const r = await request(app.getHttpServer()).get('/api/v1/sync/pull').set('Authorization', `Bearer ${adminToken}`).query({ clientId, limit: 100 }).expect(200);
    const hasSP = r.body.data.changes.some((c: any) => c.type === 'SALE_PAYMENT');
    expect(hasSP).toBe(true);
  });

  it('20. Cursor do Pull continua correcto', async () => {
    const r1 = await request(app.getHttpServer()).get('/api/v1/sync/pull').set('Authorization', `Bearer ${adminToken}`).query({ clientId, limit: 2 }).expect(200);
    if (r1.body.data.hasMore) {
      const r2 = await request(app.getHttpServer()).get('/api/v1/sync/pull').set('Authorization', `Bearer ${adminToken}`).query({ clientId, limit: 2, cursor: r1.body.data.nextCursor }).expect(200);
      expect(r2.body.data.changes).toBeInstanceOf(Array);
    }
  });

  it('21. Query da operacao PAYMENT devolve resultado persistido', async () => {
    await openSession();
    const sid = await createConfirmedSale(1);
    const key = uuid(21);
    const push = await pushPayment(key, sid, 100, 'CASH').expect(201);
    const pid = push.body.data.results[0].result.paymentId;
    const r = await request(app.getHttpServer()).get(`/api/v1/sync/operations/${key}`).set('Authorization', `Bearer ${adminToken}`).query({ clientId }).expect(200);
    expect(r.body.data.status).toBe('PROCESSED');
    expect(r.body.data.result.paymentId).toBe(pid);
  });
});