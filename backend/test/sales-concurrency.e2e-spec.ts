// @ts-nocheck
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Concorrência de Vendas (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let productId: string;
  let lotId: string;
  let saleA_Id: string;
  let saleB_Id: string;
  let pharmacyId: string;

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
    await prisma.product.deleteMany({ where: { sku: { in: ['SALE-CONC-01', 'SALE-CONC-DUPLA'] } } });

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
    adminToken = loginRes.body.data.accessToken;
    pharmacyId = loginRes.body.data.user.pharmacyId;

    // Criar Produto (Preço 100)
    const prodRes = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Produto Concorrência Venda', sku: 'SALE-CONC-01', salePrice: 100 });
    productId = prodRes.body.data.id;

    // Criar Lote com 10 unidades
    const lot = await prisma.stockLot.create({
      data: {
        pharmacyId,
        productId,
        lotNumber: 'LOTE-CONC-VENDA',
        expiryDate: new Date('2027-12-31'),
        quantityReceived: 10,
        quantityAvailable: 10,
        unitCost: 50,
        status: 'ACTIVE',
      }
    });
    lotId = lot.id;

    // Criar Venda A (8 unidades)
    const saleA = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lines: [{ productId, quantity: 8 }] });
    saleA_Id = saleA.body.data.id;

    // Criar Venda B (8 unidades)
    const saleB = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lines: [{ productId, quantity: 8 }] });
    saleB_Id = saleB.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve permitir apenas uma venda concorrente de 8 unidades (stock 10)', async () => {
    const [resA, resB] = await Promise.all([
      request(app.getHttpServer()).patch(`/api/v1/sales/${saleA_Id}/confirm`).set('Authorization', `Bearer ${adminToken}`),
      request(app.getHttpServer()).patch(`/api/v1/sales/${saleB_Id}/confirm`).set('Authorization', `Bearer ${adminToken}`)
    ]);

    const successResponses = [resA, resB].filter(r => r.status === 200);
    const failureResponses = [resA, resB].filter(r => r.status === 400);
    expect(successResponses.length).toBe(1);
    expect(failureResponses.length).toBe(1);

    const lot = await prisma.stockLot.findUnique({ where: { id: lotId } });
    expect(lot.quantityAvailable).toBe(2);

    const movements = await prisma.stockMovement.findMany({ where: { lotId } });
    expect(movements.length).toBe(1);
    expect(movements[0].quantity).toBe(-8);

    const saleLineLots = await prisma.saleLineLot.findMany({ where: { lotId } });
    expect(saleLineLots.length).toBe(1);
    expect(saleLineLots[0].quantity).toBe(8);

    const saleA = await prisma.sale.findUnique({ where: { id: saleA_Id } });
    const saleB = await prisma.sale.findUnique({ where: { id: saleB_Id } });
    expect([saleA.status, saleB.status].filter(s => s === 'CONFIRMED').length).toBe(1);
    expect([saleA.status, saleB.status].filter(s => s === 'DRAFT').length).toBe(1);
  });

  it('não deve permitir dupla confirmação da mesma venda simultaneamente', async () => {
    const newProductRes = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Produto Dupla Confirmação', sku: 'SALE-CONC-DUPLA', salePrice: 100 });
    const newProductId = newProductRes.body.data.id;

    const newLot = await prisma.stockLot.create({
      data: {
        pharmacyId,
        productId: newProductId,
        lotNumber: 'LOTE-DUPLA-CONF',
        expiryDate: new Date('2027-12-31'),
        quantityReceived: 10,
        quantityAvailable: 10,
        unitCost: 50,
        status: 'ACTIVE',
      }
    });

    const saleRes = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lines: [{ productId: newProductId, quantity: 5 }] });
    const newSaleId = saleRes.body.data.id;

    const [res1, res2] = await Promise.all([
      request(app.getHttpServer()).patch(`/api/v1/sales/${newSaleId}/confirm`).set('Authorization', `Bearer ${adminToken}`),
      request(app.getHttpServer()).patch(`/api/v1/sales/${newSaleId}/confirm`).set('Authorization', `Bearer ${adminToken}`)
    ]);

    const success = [res1, res2].filter(r => r.status === 200);
    const fail = [res1, res2].filter(r => r.status === 400);
    expect(success.length).toBe(1);
    expect(fail.length).toBe(1);

    const sale = await prisma.sale.findUnique({ where: { id: newSaleId } });
    expect(sale.status).toBe('CONFIRMED');

    const lotAfter = await prisma.stockLot.findUnique({ where: { id: newLot.id } });
    expect(lotAfter.quantityAvailable).toBe(5);

    const movements = await prisma.stockMovement.findMany({ where: { referenceId: newSaleId } });
    expect(movements.length).toBe(1);
  });
});