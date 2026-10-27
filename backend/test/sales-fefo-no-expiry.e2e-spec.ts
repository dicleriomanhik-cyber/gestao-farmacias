import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Sales FEFO without expiry (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let pharmacyId: string;
  let productId: string;
  let boxWithExpiryId: string;
  let boxNoExpiryId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const login = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
    adminToken = login.body.data.accessToken;
    pharmacyId = login.body.data.user.pharmacyId;

    const prod = await request(app.getHttpServer()).post('/api/v1/products').set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `FEFO-${Date.now()}`, sku: `FEFO-${Date.now()}`, type: 'PRODUCT', hasExpiry: false, salePrice: 50 }).expect(201);
    productId = prod.body.data.id;

    const a = await request(app.getHttpServer()).post('/api/v1/stock/boxes').set('Authorization', `Bearer ${adminToken}`)
      .send({ productId, qrCode: `FEFO-A-${Date.now()}`, totalUnits: 5, unitCost: 10 }).expect(201);
    boxNoExpiryId = a.body.data.id;

    const prod2 = await request(app.getHttpServer()).post('/api/v1/products').set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `FEFO2-${Date.now()}`, sku: `FEFO2-${Date.now()}`, type: 'PRODUCT', hasExpiry: true, salePrice: 50 }).expect(201);
    const prodWithExpiryId = prod2.body.data.id;

    const b = await request(app.getHttpServer()).post('/api/v1/stock/boxes').set('Authorization', `Bearer ${adminToken}`)
      .send({ productId: prodWithExpiryId, qrCode: `FEFO-B-${Date.now()}`, totalUnits: 5, unitCost: 10, expiryDate: '2028-12-31' }).expect(201);
    boxWithExpiryId = b.body.data.id;

    await prisma.stockLot.update({ where: { id: boxWithExpiryId }, data: { expiryDate: new Date('2020-01-01') } });
  });

  afterAll(async () => { await app.close(); });

  it('caixas expiradas nao contam para o stock disponivel', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/stock/boxes').set('Authorization', `Bearer ${adminToken}`).expect(200);
    const boxWithExpiry = res.body.data.data.find((b: any) => b.id === boxWithExpiryId);
    expect(boxWithExpiry.state).toBe('EXPIRED');
    expect(boxWithExpiry.quantityAvailable).toBe(5);
  });

  it('venda consome caixa sem validade (NULLS LAST)', async () => {
    const sale = await request(app.getHttpServer()).post('/api/v1/sales').set('Authorization', `Bearer ${adminToken}`)
      .send({ lines: [{ productId, quantity: 3 }] }).expect(201);
    const confirmRes = await request(app.getHttpServer()).patch(`/api/v1/sales/${sale.body.data.id}/confirm`).set('Authorization', `Bearer ${adminToken}`);
    if (confirmRes.status !== 200) console.log('CONFIRM_ERROR_BODY:', JSON.stringify(confirmRes.body));
    expect(confirmRes.status).toBe(200);
    const box = await prisma.stockLot.findUnique({ where: { id: boxNoExpiryId } });
    expect(box?.quantityAvailable).toBe(2);
  });

  it('venda sem stock suficiente falha integralmente', async () => {
    const sale = await request(app.getHttpServer()).post('/api/v1/sales').set('Authorization', `Bearer ${adminToken}`)
      .send({ lines: [{ productId, quantity: 100 }] }).expect(201);
    const before = await prisma.stockLot.findUnique({ where: { id: boxNoExpiryId } });
    const confirmRes = await request(app.getHttpServer()).patch(`/api/v1/sales/${sale.body.data.id}/confirm`).set('Authorization', `Bearer ${adminToken}`);
    if (confirmRes.status !== 400) console.log('EXPECTED_400_BUT_GOT:', confirmRes.status, JSON.stringify(confirmRes.body));
    expect(confirmRes.status).toBe(400);
    const after = await prisma.stockLot.findUnique({ where: { id: boxNoExpiryId } });
    expect(after?.quantityAvailable).toBe(before?.quantityAvailable);
  });
});