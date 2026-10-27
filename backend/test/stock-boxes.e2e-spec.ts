import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Stock Boxes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let pharmacyId: string;
  let medicineProductId: string;
  let plainProductId: string;

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

    const med = await request(app.getHttpServer()).post('/api/v1/products').set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Med-${Date.now()}`, sku: `MED-${Date.now()}`, type: 'MEDICINE', strength: '500mg', activeIngredient: 'Paracetamol', salePrice: 100 }).expect(201);
    medicineProductId = med.body.data.id;

    const plain = await request(app.getHttpServer()).post('/api/v1/products').set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Plain-${Date.now()}`, sku: `PLN-${Date.now()}`, type: 'PRODUCT', hasExpiry: false, salePrice: 50 }).expect(201);
    plainProductId = plain.body.data.id;
  });

  afterAll(async () => { await app.close(); });

  it('1. registar caixa MEDICINE com QR, innerCount, unitsPerInner', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/stock/boxes').set('Authorization', `Bearer ${adminToken}`)
      .send({ productId: medicineProductId, qrCode: `QR-${randomUUID()}`, innerCount: 10, unitsPerInner: 5, unitCost: 50, expiryDate: '2027-12-31' })
      .expect(201);
    expect(res.body.data.totalUnits).toBe(50);
    expect(res.body.data.quantityAvailable).toBe(50);
    expect(res.body.data.qrCode).toBeDefined();
  });

  it('2. registar caixa PRODUCT sem validade', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/stock/boxes').set('Authorization', `Bearer ${adminToken}`)
      .send({ productId: plainProductId, qrCode: `QR-${randomUUID()}`, totalUnits: 20, unitCost: 10 })
      .expect(201);
    expect(res.body.data.totalUnits).toBe(20);
    expect(res.body.data.expiryDate).toBeNull();
  });

  it('3. rejeitar QR duplicado na mesma farmacia', async () => {
    const qr = `QR-DUP-${randomUUID()}`;
    await request(app.getHttpServer()).post('/api/v1/stock/boxes').set('Authorization', `Bearer ${adminToken}`)
      .send({ productId: plainProductId, qrCode: qr, totalUnits: 5, unitCost: 10 }).expect(201);
    await request(app.getHttpServer()).post('/api/v1/stock/boxes').set('Authorization', `Bearer ${adminToken}`)
      .send({ productId: plainProductId, qrCode: qr, totalUnits: 5, unitCost: 10 }).expect(400);
  });

  it('4. MEDICINE sem innerCount falha', async () => {
    await request(app.getHttpServer()).post('/api/v1/stock/boxes').set('Authorization', `Bearer ${adminToken}`)
      .send({ productId: medicineProductId, qrCode: `QR-${randomUUID()}`, unitCost: 50, expiryDate: '2027-12-31' }).expect(400);
  });

  it('5. listar caixas com paginacao', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/stock/boxes').set('Authorization', `Bearer ${adminToken}`).query({ limit: 10 }).expect(200);
    expect(res.body.data.data).toBeInstanceOf(Array);
    expect(res.body.data.meta).toBeDefined();
  });

  it('6. filtrar caixas por type', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/stock/boxes').set('Authorization', `Bearer ${adminToken}`).query({ type: 'MEDICINE' }).expect(200);
    expect(res.body.data.data.every((b: any) => b.type === 'MEDICINE')).toBe(true);
  });

  it('7. detalhe de caixa mostra packs calculados', async () => {
    const list = await request(app.getHttpServer()).get('/api/v1/stock/boxes').set('Authorization', `Bearer ${adminToken}`).query({ type: 'MEDICINE', limit: 1 }).expect(200);
    const box = list.body.data.data[0];
    const detail = await request(app.getHttpServer()).get(`/api/v1/stock/boxes/${box.id}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(detail.body.data.packs).toBeInstanceOf(Array);
    expect(detail.body.data.packs.length).toBeGreaterThan(0);
  });

  it('8. products-summary agrega stock por produto', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/stock/products-summary').set('Authorization', `Bearer ${adminToken}`).expect(200);
    const med = res.body.data.find((p: any) => p.productId === medicineProductId);
    expect(med).toBeDefined();
    expect(med.totalAvailable).toBeGreaterThan(0);
    expect(med.saleUnitLabel).toBe('carteira');
    expect(med.boxesCount).toBeGreaterThan(0);
  });
});