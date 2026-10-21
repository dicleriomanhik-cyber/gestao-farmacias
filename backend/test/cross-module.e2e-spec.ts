// @ts-nocheck
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Cross-Module Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let pharmacyId: string;
  let productId: string;
  let supplierId: string;
  let purchaseLineId: string;
  let lotId: string;
  let saleId: string;
  let returnId: string;
  let returnLineId: string;

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
    await prisma.expense.deleteMany({});
    await prisma.cashSession.deleteMany({});
    await prisma.saleLineLot.deleteMany({});
    await prisma.saleLine.deleteMany({});
    await prisma.sale.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.stockLot.deleteMany({});
    await prisma.purchaseLine.deleteMany({});
    await prisma.purchase.deleteMany({});
    await prisma.supplier.deleteMany({});
    await prisma.product.deleteMany({ where: { sku: 'CROSS-TEST' } });

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
    adminToken = loginRes.body.data.accessToken;
    pharmacyId = loginRes.body.data.user.pharmacyId;

    // Setup Base
    const prod = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Produto Cross', sku: 'CROSS-TEST', salePrice: 100 });
    productId = prod.body.data.id;

    const sup = await request(app.getHttpServer())
      .post('/api/v1/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Fornecedor Cross', taxId: 'CROSS123' });
    supplierId = sup.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('Fluxo 1: Compra → Lote → Stock → Venda → Pagamento → Caixa', async () => {
    // 1. Criar Compra
    const purch = await request(app.getHttpServer())
      .post('/api/v1/purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ supplierId, documentNumber: 'FAT-CROSS-01', lines: [{ productId, quantity: 10, unitCost: 50 }] })
      .expect(201);
    const purchaseId = purch.body.data.id;
    purchaseLineId = purch.body.data.lines[0].id;

    // 2. Confirmar Compra
    await request(app.getHttpServer())
      .patch(`/api/v1/purchases/${purchaseId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // 3. Receber Stock (Lote)
    const stockRes = await request(app.getHttpServer())
      .post('/api/v1/stock/receive')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ purchaseLineId, lotNumber: 'LOTE-CROSS', expiryDate: '2027-12-31T00:00:00.000Z', quantity: 10, unitCost: 50 })
      .expect(201);
    lotId = stockRes.body.data.id;

    // 4. Abrir Caixa
    const cash = await request(app.getHttpServer())
      .post('/api/v1/cash/open')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ openingBalance: 1000 })
      .expect(201);

    // 5. Criar e Confirmar Venda
    const saleRes = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lines: [{ productId, quantity: 2 }] })
      .expect(201);
    saleId = saleRes.body.data.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/sales/${saleId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // 6. Pagar Venda
    await request(app.getHttpServer())
      .post('/api/v1/cash/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ saleId, method: 'CASH', amount: 200 })
      .expect(201);

    // 7. Verificar Stock Final
    const lot = await prisma.stockLot.findUnique({ where: { id: lotId } });
    expect(lot.quantityAvailable).toBe(8);
  });

  it('Fluxo 2: Venda → Devolução → Quarentena → Reembolso → Caixa', async () => {
    const saleLine = await prisma.saleLine.findFirst({ where: { saleId } });

    // 1. Criar Devolução (COM lote e validade verificáveis)
    const ret = await request(app.getHttpServer())
      .post('/api/v1/returns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        saleId,
        reason: 'Teste Cross',
        lines: [{ saleLineId: saleLine.id, quantity: 1, lotNumber: 'LOTE-CROSS', expiryDate: '2027-12-31' }]
      })
      .expect(201);
    returnId = ret.body.data.id;
    
    const retLine = await prisma.saleReturnLine.findFirst({ where: { returnId } });
    returnLineId = retLine.id;

    // 2. Confirmar Devolução
    await request(app.getHttpServer())
      .patch(`/api/v1/returns/${returnId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const q = await prisma.quarantineStock.findFirst({ where: { saleReturnLineId: returnLineId } });
    expect(q.quantityReceived).toBe(1);
    expect(q.quantityReleased).toBe(0);

    // 3. Inspecionar e Libertar (1 unidade)
    await request(app.getHttpServer())
      .patch(`/api/v1/returns/${returnId}/lines/${returnLineId}/inspect`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ condition: 'RESELLABLE', quantityToRelease: 1 })
      .expect(200);

    const lotAfterInspect = await prisma.stockLot.findUnique({ where: { id: lotId } });
    expect(lotAfterInspect.quantityAvailable).toBe(9);

    // 4. Efetuar Reembolso (COM cashSessionId)
    const session = await prisma.cashSession.findFirst({ where: { status: 'OPEN' } });
    const salePayment = await prisma.salePayment.findFirst({ where: { saleId } });
    
    await request(app.getHttpServer())
      .post(`/api/v1/returns/${returnId}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        returnLineId,
        salePaymentId: salePayment.id,
        method: 'CASH',
        amount: 100,
        cashSessionId: session.id
      })
      .expect(201);
  });

  it('Fluxo 3: Despesa → Caixa → Relatório', async () => {
    // 1. Criar Despesa CASH
    const exp = await request(app.getHttpServer())
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Despesa Cross', category: 'OTHER', amount: 50, method: 'CASH' })
      .expect(201);

    // 2. Confirmar Despesa
    await request(app.getHttpServer())
      .patch(`/api/v1/expenses/${exp.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // 3. Consultar Relatório de Caixa
    const report = await request(app.getHttpServer())
      .get('/api/v1/reports/cash')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const session = report.body.data.sessions[0];
    // Abertura: 1000. Vendas CASH: 200. Reembolso CASH: 100 (saída). Despesa CASH: 50 (saída).
    // Expected físico = 1000 + 200 - 100 - 50 = 1050.
    expect(parseFloat(session.expectedBalance)).toBe(1050);
    expect(parseFloat(session.breakdown.expensesCash)).toBe(50);
  });
});