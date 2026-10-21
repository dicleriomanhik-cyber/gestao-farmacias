// @ts-nocheck
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Concorrência de Caixa (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let productId: string;

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
    await prisma.cashMovement.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.saleLineLot.deleteMany({});
    await prisma.saleLine.deleteMany({});
    await prisma.sale.deleteMany({});
    await prisma.cashSession.deleteMany({});
    await prisma.stockLot.deleteMany({});
    await prisma.product.deleteMany({ where: { sku: 'CASH-CONC-01' } });

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
    adminToken = loginRes.body.data.accessToken;
    const pharmacyId = loginRes.body.data.user.pharmacyId;

    // Criar Produto e Lote
    const prod = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Produto Cash Conc', sku: 'CASH-CONC-01', salePrice: 100 });
    productId = prod.body.data.id;

    await prisma.stockLot.create({
      data: {
        pharmacyId,
        productId,
        lotNumber: 'LOTE-CASH-CONC',
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

  it('deve impedir pagamento ou fecho simultâneo inconsistente', async () => {
    const newSessionRes = await request(app.getHttpServer())
      .post('/api/v1/cash/open')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ openingBalance: 2000 });
    const newSessionId = newSessionRes.body.data.id;

    const saleRes = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lines: [{ productId, quantity: 1 }] });
    const newSaleId = saleRes.body.data.id;
    await request(app.getHttpServer())
      .patch(`/api/v1/sales/${newSaleId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);

    const [resPayment, resClose] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/cash/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ saleId: newSaleId, method: 'CASH', amount: 100 }),
      request(app.getHttpServer())
        .patch(`/api/v1/cash/${newSessionId}/close`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ countedBalance: 2100 })
    ]);

    const successPayment = resPayment.status === 201;
    const successClose = resClose.status === 200;

    const session = await prisma.cashSession.findUnique({ where: { id: newSessionId } });

    if (successClose) {
      const expected = successPayment ? 2100 : 2000;
      expect(parseFloat(session.expectedBalance)).toBe(expected);
    } else {
      expect(session.status).toBe('OPEN');
    }
  });

  it('deve impedir movimento ou fecho simultâneo inconsistente', async () => {
    // Fechar sessão anterior se aberta
    const openSession = await prisma.cashSession.findFirst({ where: { status: 'OPEN' } });
    if (openSession) {
      await request(app.getHttpServer())
        .patch(`/api/v1/cash/${openSession.id}/close`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ countedBalance: 5000 });
    }

    const newSessionRes = await request(app.getHttpServer())
      .post('/api/v1/cash/open')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ openingBalance: 3000 });
    const newSessionId = newSessionRes.body.data.id;

    const [resMovement, resClose] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/cash/movements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'IN', amount: 500, reason: 'Entrada teste' }),
      request(app.getHttpServer())
        .patch(`/api/v1/cash/${newSessionId}/close`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ countedBalance: 3500 })
    ]);

    const successMovement = resMovement.status === 201;
    const successClose = resClose.status === 200;

    const session = await prisma.cashSession.findUnique({ where: { id: newSessionId } });

    if (successClose) {
      const expected = successMovement ? 3500 : 3000;
      expect(parseFloat(session.expectedBalance)).toBe(expected);
    } else {
      expect(session.status).toBe('OPEN');
    }
  });

  it('deve impedir dois pagamentos concorrentes com a mesma idempotencyKey', async () => {
    const openSession = await prisma.cashSession.findFirst({ where: { status: 'OPEN' } });
    if (!openSession) {
      await request(app.getHttpServer())
        .post('/api/v1/cash/open')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ openingBalance: 5000 });
    }

    const saleRes = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lines: [{ productId, quantity: 5 }] });
    const newSaleId = saleRes.body.data.id;
    await request(app.getHttpServer())
      .patch(`/api/v1/sales/${newSaleId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);

    const payload = { saleId: newSaleId, method: 'MPESA', amount: 100, idempotencyKey: 'conc-key-01' };

    const [res1, res2] = await Promise.all([
      request(app.getHttpServer()).post('/api/v1/cash/payments').set('Authorization', `Bearer ${adminToken}`).send(payload),
      request(app.getHttpServer()).post('/api/v1/cash/payments').set('Authorization', `Bearer ${adminToken}`).send(payload),
    ]);

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    expect(res1.body.data.id).toBe(res2.body.data.id);

    const payments = await prisma.salePayment.findMany({ where: { idempotencyKey: 'conc-key-01' } });
    expect(payments.length).toBe(1);
  });
});