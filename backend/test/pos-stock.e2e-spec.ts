import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('POS Stock (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let pharmacyId: string;
  let productId: string;
  let boxId: string;

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
      .send({ name: `POS-${Date.now()}`, sku: `POS-${Date.now()}`, type: 'PRODUCT', hasExpiry: false, salePrice: 50, minStock: 5 }).expect(201);
    productId = prod.body.data.id;

    const box = await request(app.getHttpServer()).post('/api/v1/stock/boxes').set('Authorization', `Bearer ${adminToken}`)
      .send({ productId, qrCode: `POS-QR-${Date.now()}`, totalUnits: 10, unitCost: 10 }).expect(201);
    boxId = box.body.data.id;
  });

  afterAll(async () => { await app.close(); });

  it('1. GET /pos/stock devolve apenas campos permitidos ao colaborador', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/sales/pos/stock').set('Authorization', `Bearer ${adminToken}`).expect(200);
    const item = res.body.data.find((p: any) => p.productId === productId);
    expect(item).toBeDefined();
    expect(item.name).toBeDefined();
    expect(item.saleUnitLabel).toBe('unidade');
    expect(item.totalAvailable).toBe(10);
    expect(item.level).toBe('OK');
    expect(item.nearestExpiry).toBeNull();

    // Campos proibidos nao devem estar presentes
    expect(item.qrCode).toBeUndefined();
    expect(item.innerCount).toBeUndefined();
    expect(item.unitsPerInner).toBeUndefined();
    expect(item.lotNumber).toBeUndefined();
    expect(item.packs).toBeUndefined();
    expect(item.salesHistory).toBeUndefined();
  });

  it('2. level LOW quando abaixo do minStock', async () => {
    await prisma.stockLot.update({ where: { id: boxId }, data: { quantityAvailable: 3 } });
    const res = await request(app.getHttpServer()).get('/api/v1/sales/pos/stock').set('Authorization', `Bearer ${adminToken}`).expect(200);
    const item = res.body.data.find((p: any) => p.productId === productId);
    expect(item.level).toBe('LOW');
  });

  it('3. level EMPTY quando sem stock', async () => {
    await prisma.stockLot.update({ where: { id: boxId }, data: { quantityAvailable: 0 } });
    const res = await request(app.getHttpServer()).get('/api/v1/sales/pos/stock').set('Authorization', `Bearer ${adminToken}`).expect(200);
    const item = res.body.data.find((p: any) => p.productId === productId);
    expect(item.level).toBe('EMPTY');
  });
});