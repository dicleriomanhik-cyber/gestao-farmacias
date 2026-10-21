// @ts-nocheck
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Concorrência de Stock (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let lotId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    // Limpar (Ordem correcta!)
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
    await prisma.purchaseLine.deleteMany({});
    await prisma.purchase.deleteMany({});
    await prisma.supplier.deleteMany({ where: { name: 'Fornecedor Concorrência' } });
    await prisma.product.deleteMany({ where: { sku: 'CONC-TEST-01' } });

    // Setup (Login, Produto, Fornecedor, Compra, Lote com 10 unidades)
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
    adminToken = loginRes.body.data.accessToken;

    const prod = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Produto Conc', sku: 'CONC-TEST-01', salePrice: 100 });

    const sup = await request(app.getHttpServer())
      .post('/api/v1/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Fornecedor Concorrência', taxId: '999' });

    const purch = await request(app.getHttpServer())
      .post('/api/v1/purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId: sup.body.data.id,
        documentNumber: 'FAT-CONC-01',
        lines: [{ productId: prod.body.data.id, quantity: 10, unitCost: 50 }]
      });

    await request(app.getHttpServer())
      .patch(`/api/v1/purchases/${purch.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);

    const lot = await request(app.getHttpServer())
      .post('/api/v1/stock/receive')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        purchaseLineId: purch.body.data.lines[0].id,
        lotNumber: 'LOTE-CONC',
        expiryDate: '2027-12-31T00:00:00.000Z',
        quantity: 10,
        unitCost: 50
      });
    lotId = lot.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve proteger contra stock negativo em concorrência', async () => {
    const payload = { lotId, quantity: -8, reason: 'Teste concorrência' };

    const [res1, res2] = await Promise.all([
      request(app.getHttpServer()).post('/api/v1/stock/adjust').set('Authorization', `Bearer ${adminToken}`).send(payload),
      request(app.getHttpServer()).post('/api/v1/stock/adjust').set('Authorization', `Bearer ${adminToken}`).send(payload),
    ]);

    const successes = [res1, res2].filter(r => r.status === 201);
    const failures = [res1, res2].filter(r => r.status === 400);
    
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

    const lot = await prisma.stockLot.findUnique({ where: { id: lotId } });
    expect(lot.quantityAvailable).toBe(2);

    const movements = await prisma.stockMovement.findMany({ where: { lotId } });
    expect(movements.length).toBe(2);
    
    const totalMovement = movements.reduce((acc, m) => acc + m.quantity, 0);
    expect(totalMovement).toBe(2);
  });
});