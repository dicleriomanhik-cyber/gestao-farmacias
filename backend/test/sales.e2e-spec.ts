import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Sales & POS (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let productId: string;
  let saleId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    // Limpar
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
    await prisma.product.deleteMany({ where: { sku: 'SALE-TEST-01' } });

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
    adminToken = loginRes.body.data.accessToken;
    const pharmacyId = loginRes.body.data.user.pharmacyId;

    // Produto (Preço 100)
    const prodRes = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Produto Venda', sku: 'SALE-TEST-01', salePrice: 100 });
    productId = prodRes.body.data.id;

    // Lote com 10 unidades
    await prisma.stockLot.create({
      data: {
        pharmacyId,
        productId,
        lotNumber: 'LOTE-VENDA-01',
        expiryDate: new Date('2027-12-31'),
        quantityReceived: 10,
        quantityAvailable: 10,
        unitCost: 50,
        status: 'ACTIVE',
      }
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve criar uma venda DRAFT', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        lines: [{ productId, quantity: 2 }]
      })
      .expect(201);
    
    saleId = res.body.data.id;
    expect(res.body.data.status).toBe('DRAFT');
    expect(parseFloat(res.body.data.total)).toBe(200);
  });

  it('DRAFT não altera stock', async () => {
    const lot = await prisma.stockLot.findFirst({ where: { productId } });
    expect(lot.quantityAvailable).toBe(10);
  });

  it('deve confirmar a venda e reduzir stock', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/sales/${saleId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    
    expect(res.body.data.status).toBe('CONFIRMED');
    
    const lot = await prisma.stockLot.findFirst({ where: { productId } });
    expect(lot.quantityAvailable).toBe(8);

    const movements = await prisma.stockMovement.findMany({ where: { lotId: lot.id } });
    expect(movements.length).toBe(1);
    expect(movements[0].type).toBe('SALE');
    expect(movements[0].quantity).toBe(-2);
  });

  it('não deve permitir confirmar novamente', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/sales/${saleId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });
});
