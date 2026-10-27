import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Sync (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let pharmacyId: string;
  let productId: string;
  let productConcId: string;
  let productReuseId: string;
  let clientId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.syncOperation.deleteMany({});
    await prisma.syncClient.deleteMany({});
    await prisma.returnRefund.deleteMany({});
    await prisma.quarantineStock.deleteMany({});
    await prisma.saleReturnLine.deleteMany({});
    await prisma.saleReturn.deleteMany({});
    await prisma.salePayment.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.saleLineLot.deleteMany({});
    await prisma.saleLine.deleteMany({});
    await prisma.sale.deleteMany({});
    await prisma.stockLot.deleteMany({});
    await prisma.product.deleteMany({ where: { sku: { in: ['SYNC-TEST-01', 'SYNC-TEST-CONC', 'SYNC-TEST-REUSE'] } } });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
    adminToken = loginRes.body.data.accessToken;
    pharmacyId = loginRes.body.data.user.pharmacyId;

    // Produto base
    const prodRes = await request(app.getHttpServer()).post('/api/v1/products').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Produto Sync', sku: 'SYNC-TEST-01', salePrice: 100 });
    productId = prodRes.body.data.id;
    await prisma.stockLot.create({ data: { pharmacyId, productId, lotNumber: 'SYNC-LOT-01', expiryDate: new Date('2027-12-31'), quantityReceived: 10, quantityAvailable: 10, unitCost: 50, status: 'ACTIVE' } });

    // Produto isolado p/ concorrencia: um unico lote, validade distinta, stock folgado
    const prodConc = await request(app.getHttpServer()).post('/api/v1/products').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Produto Sync Conc', sku: 'SYNC-TEST-CONC', salePrice: 100 });
    productConcId = prodConc.body.data.id;
    await prisma.stockLot.create({ data: { pharmacyId, productId: productConcId, lotNumber: 'SYNC-LOT-CONC', expiryDate: new Date('2028-06-30'), quantityReceived: 500, quantityAvailable: 500, unitCost: 50, status: 'ACTIVE' } });

    // Produto isolado p/ reutilizacao de chave
    const prodReuse = await request(app.getHttpServer()).post('/api/v1/products').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Produto Sync Reuse', sku: 'SYNC-TEST-REUSE', salePrice: 100 });
    productReuseId = prodReuse.body.data.id;
    await prisma.stockLot.create({ data: { pharmacyId, productId: productReuseId, lotNumber: 'SYNC-LOT-REUSE', expiryDate: new Date('2028-09-30'), quantityReceived: 500, quantityAvailable: 500, unitCost: 50, status: 'ACTIVE' } });

    const client = await prisma.syncClient.create({ data: { pharmacyId, clientId: 'bfd66653-45f7-4466-b1bc-4fc5f9b27918', appVersion: '1.0.0', status: 'ACTIVE' } });
    clientId = client.clientId;
  });

  afterAll(async () => { await app.close(); });

  it('deve processar uma venda offline valida', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: '5bee8aef-a5af-48fb-9f4f-109d9427d3fa', operationType: 'SALE', payload: { lines: [{ productId, quantity: 1 }] } }] })
      .expect(201);
    expect(res.body.data.results[0].status).toBe('PROCESSED');
    expect(res.body.data.results[0].result.saleId).toBeDefined();
  });

  it('nao deve duplicar venda com o mesmo idempotencyKey', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: '5bee8aef-a5af-48fb-9f4f-109d9427d3fa', operationType: 'SALE', payload: { lines: [{ productId, quantity: 1 }] } }] })
      .expect(201);
    expect(res.body.data.results[0].status).toBe('PROCESSED');
    const count = await prisma.sale.count({ where: { pharmacyId } });
    expect(count).toBe(1);
  });

  it('deve rejeitar venda com stock insuficiente (CONFLICT)', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: 'a3476f30-3616-49d9-a733-5f8770066a4a', operationType: 'SALE', payload: { lines: [{ productId, quantity: 999 }] } }] })
      .expect(201);
    expect(res.body.data.results[0].status).toBe('CONFLICT');
    expect(res.body.data.results[0].rejectionCode).toBe('STOCK_CONFLICT');
  });

  it('deve rejeitar operacao nao suportada', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: 'b4a96eec-b318-4edd-8043-a71e2b145a8a', operationType: 'PURCHASE', payload: {} }] })
      .expect(201);
    expect(res.body.data.results[0].status).toBe('REJECTED');
    expect(res.body.data.results[0].rejectionCode).toBe('UNSUPPORTED_OPERATION');
  });

  it('deve rejeitar cliente de outra farmacia (404)', async () => {
    const phB = await prisma.pharmacy.create({ data: { name: 'Farmacia B Sync', status: 'ACTIVE' } });
    const clientB = await prisma.syncClient.create({ data: { pharmacyId: phB.id, clientId: '6e18edbb-5257-40f0-81fb-8dae1835dda4', appVersion: '1.0.0', status: 'ACTIVE' } });
    await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId: clientB.clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: '6e18edbb-5257-40f0-81fb-8dae1835dda4', operationType: 'SALE', payload: {} }] })
      .expect(404);
    await prisma.syncClient.delete({ where: { id: clientB.id } });
    await prisma.pharmacy.delete({ where: { id: phB.id } });
  });

  it('deve rejeitar payload superior a 64 KiB', async () => {
    const bigPayload = { lines: [{ productId, quantity: 1 }], extra: 'x'.repeat(70000) };
    const res = await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: '9614f8f7-6f8c-486f-b5ad-ebe196b6b9d9', operationType: 'SALE', payload: bigPayload }] })
      .expect(201);
    expect(res.body.data.results[0].status).toBe('REJECTED');
    expect(res.body.data.results[0].rejectionCode).toBe('PAYLOAD_TOO_LARGE');
  });

  it('deve rejeitar versao de cliente incompativel (422)', async () => {
    await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, appVersion: '0.9.0', operations: [{ idempotencyKey: '83bb10c2-2b87-40a8-ad8d-8a0c81e5e953', operationType: 'SALE', payload: { lines: [{ productId, quantity: 1 }] } }] })
      .expect(422);
  });

  it('deve garantir concorrencia com a mesma chave (apenas uma venda)', async () => {
    const op = { idempotencyKey: '11111111-1111-4111-8111-111111111111', operationType: 'SALE', payload: { lines: [{ productId: productConcId, quantity: 20 }] } };
    const results = await Promise.all([
      request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`).send({ clientId, appVersion: '1.0.0', operations: [op] }),
      request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`).send({ clientId, appVersion: '1.0.0', operations: [op] }),
    ]);
    console.log('DEBUG concorrencia:', JSON.stringify(results.map(r => ({ status: r.status, body: r.body })), null, 2));
    expect(results.every(r => r.status === 201)).toBe(true);
    const sales = await prisma.sale.findMany({ where: { pharmacyId, lines: { some: { productId: productConcId } } } });
    expect(sales.length).toBe(1);
  });

  it('deve rejeitar reutilizacao de chave com conteudo diferente', async () => {
    const key = '22222222-2222-4222-8222-222222222222';
    await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: key, operationType: 'SALE', payload: { lines: [{ productId: productReuseId, quantity: 5 }] } }] })
      .expect(201);
    const res = await request(app.getHttpServer()).post('/api/v1/sync/push').set('Authorization', `Bearer ${adminToken}`)
      .send({ clientId, appVersion: '1.0.0', operations: [{ idempotencyKey: key, operationType: 'SALE', payload: { lines: [{ productId: productReuseId, quantity: 2 }] } }] })
      .expect(201);
    console.log('DEBUG reuse:', JSON.stringify(res.body, null, 2));
    expect(res.body.data.results[0].status).toBe('REJECTED');
    expect(res.body.data.results[0].rejectionCode).toBe('IDEMPOTENCY_KEY_CONFLICT');
  });
});