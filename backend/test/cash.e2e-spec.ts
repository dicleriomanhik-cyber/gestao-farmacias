import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Caixa e Pagamentos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let sessionId: string;
  let saleId: string;
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
    await prisma.product.deleteMany({ where: { sku: 'CASH-TEST-01' } });

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
      .send({ name: 'Produto Cash', sku: 'CASH-TEST-01', salePrice: 100 });
    productId = prod.body.data.id;

    await prisma.stockLot.create({
      data: {
        pharmacyId,
        productId,
        lotNumber: 'LOTE-CASH',
        expiryDate: new Date('2027-12-31'),
        quantityReceived: 10,
        quantityAvailable: 10,
        unitCost: 50,
        status: 'ACTIVE',
      }
    });

    // Criar Venda Confirmada para pagar
    const saleRes = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lines: [{ productId, quantity: 1 }] });
    
    await request(app.getHttpServer())
      .patch(`/api/v1/sales/${saleRes.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    saleId = saleRes.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve abrir uma sessão de caixa', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/cash/open')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ openingBalance: 1000 })
      .expect(201);
    
    sessionId = res.body.data.id;
    expect(res.body.data.status).toBe('OPEN');
  });

  it('deve rejeitar abertura de segunda sessão', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/cash/open')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ openingBalance: 500 })
      .expect(409);
  });

  it('deve registar pagamento CASH de 100', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/cash/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ saleId, method: 'CASH', amount: 100 })
      .expect(201);
    expect(res.body.data.method).toBe('CASH');
  });

  it('deve registar um movimento de saída de caixa', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/cash/movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'OUT', amount: 100, reason: 'Compra de material' })
      .expect(201);
  });

  it('deve impedir pagamento duplicado com a mesma idempotencyKey', async () => {
    const saleRes = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lines: [{ productId, quantity: 2 }] });
    const newSaleId = saleRes.body.data.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/sales/${newSaleId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);

    const payload = { saleId: newSaleId, method: 'MPESA', amount: 50, idempotencyKey: 'pay-001' };
    
    const res1 = await request(app.getHttpServer())
      .post('/api/v1/cash/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(201);

    const res2 = await request(app.getHttpServer())
      .post('/api/v1/cash/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(201);

    expect(res1.body.data.id).toBe(res2.body.data.id);
  });

  it('deve fechar a caixa calculando apenas dinheiro físico', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/cash/${sessionId}/close`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ countedBalance: 1000 })
      .expect(200);
    
    expect(parseFloat(res.body.data.expectedBalance)).toBe(1000);
    expect(parseFloat(res.body.data.difference)).toBe(0);
  });

  it('deve calcular saldo físico de 1100 num cenário com cash, M-Pesa e saída', async () => {
    const openRes = await request(app.getHttpServer())
      .post('/api/v1/cash/open')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ openingBalance: 1000 });
    const newSessionId = openRes.body.data.id;

    // Criar venda 1 (para receber 200 CASH)
    const sale1 = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lines: [{ productId, quantity: 2 }] });
    await request(app.getHttpServer())
      .patch(`/api/v1/sales/${sale1.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);

    await request(app.getHttpServer())
      .post('/api/v1/cash/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ saleId: sale1.body.data.id, method: 'CASH', amount: 200 });

    // Criar venda 2 (para receber 300 MPESA)
    const sale2 = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lines: [{ productId, quantity: 3 }] });
    await request(app.getHttpServer())
      .patch(`/api/v1/sales/${sale2.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);

    await request(app.getHttpServer())
      .post('/api/v1/cash/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ saleId: sale2.body.data.id, method: 'MPESA', amount: 300 });

    // Saída física de 100
    await request(app.getHttpServer())
      .post('/api/v1/cash/movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'OUT', amount: 100, reason: 'Saída teste' });

    // Fechar caixa contando 1100 (esperado: 1000 + 200 - 100 = 1100)
    const closeRes = await request(app.getHttpServer())
      .patch(`/api/v1/cash/${newSessionId}/close`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ countedBalance: 1100 })
      .expect(200);

    expect(parseFloat(closeRes.body.data.expectedBalance)).toBe(1100);
    expect(parseFloat(closeRes.body.data.difference)).toBe(0);
  });
});
