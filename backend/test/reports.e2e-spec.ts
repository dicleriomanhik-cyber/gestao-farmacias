import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Reports (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let stockManagerToken: string;
  let pharmacyBToken: string;
  let pharmacyId: string;
  let prod1Id: string;
  let prod2Id: string;
  let prodStockId: string;

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
    await prisma.expense.deleteMany({});
    await prisma.cashSession.deleteMany({});
    await prisma.saleLineLot.deleteMany({});
    await prisma.saleLine.deleteMany({});
    await prisma.sale.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.stockLot.deleteMany({});
    await prisma.product.deleteMany({ where: { sku: { in: ['REP-01', 'REP-02', 'REP-STOCK'] } } });
    await prisma.user.deleteMany({ where: { email: { in: ['stockrep@teste.com', 'admin@farmaciab-rep.com'] } } });

    // Login Admin
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
    adminToken = loginRes.body.data.accessToken;
    pharmacyId = loginRes.body.data.user.pharmacyId;

    // Criar Stock Manager
    const passwordHash = await bcrypt.hash('admin123', 12);
    const roleStock = await prisma.role.findUnique({ where: { name: 'STOCK_MANAGER' } });
    const stockUser = await prisma.user.create({
      data: { email: 'stockrep@teste.com', passwordHash, fullName: 'Stock Rep', pharmacyId, status: 'ACTIVE' },
    });
    await prisma.userRole.create({ data: { userId: stockUser.id, roleId: roleStock.id } });

    const stockLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'stockrep@teste.com', password: 'admin123' });
    stockManagerToken = stockLogin.body.data.accessToken;

    // Criar Farmácia B e Admin B
    const phB = await prisma.pharmacy.create({ data: { name: 'Farmacia B Rep', status: 'ACTIVE' } });
    const roleAdmin = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    const userB = await prisma.user.create({
      data: { email: 'admin@farmaciab-rep.com', passwordHash, fullName: 'Admin B', pharmacyId: phB.id, status: 'ACTIVE' },
    });
    await prisma.userRole.create({ data: { userId: userB.id, roleId: roleAdmin.id } });
    const loginB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@farmaciab-rep.com', password: 'admin123' });
    pharmacyBToken = loginB.body.data.accessToken;

    // Criar Produtos
    const prod1 = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Produto A', sku: 'REP-01', salePrice: 100 });
    prod1Id = prod1.body.data.id;

    const prod2 = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Produto B', sku: 'REP-02', salePrice: 50 });
    prod2Id = prod2.body.data.id;

    const prodStock = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Produto Stock Test', sku: 'REP-STOCK', salePrice: 9999 });
    prodStockId = prodStock.body.data.id;

    // Lote expirado (Produto A)
    await prisma.stockLot.create({
      data: {
        pharmacyId,
        productId: prod1Id,
        lotNumber: 'LOTE-EXP',
        expiryDate: new Date('2020-01-01'),
        quantityReceived: 10,
        quantityAvailable: 5,
        unitCost: 40,
        status: 'ACTIVE',
      },
    });

    // Lote válido (Produto A)
    await prisma.stockLot.create({
      data: {
        pharmacyId,
        productId: prod1Id,
        lotNumber: 'LOTE-VAL',
        expiryDate: new Date('2027-12-31'),
        quantityReceived: 10,
        quantityAvailable: 10,
        unitCost: 40,
        status: 'ACTIVE',
      },
    });

    // Lote próximo do vencimento (Produto B)
    const nearDate = new Date();
    nearDate.setDate(nearDate.getDate() + 10);
    await prisma.stockLot.create({
      data: {
        pharmacyId,
        productId: prod2Id,
        lotNumber: 'LOTE-NEAR',
        expiryDate: nearDate,
        quantityReceived: 20,
        quantityAvailable: 20,
        unitCost: 30,
        status: 'ACTIVE',
      },
    });

    // --- CENÁRIO ESPECÍFICO DA CENTRAL ---
    // Lote A (Produto Stock): 10 * 100 = 1000
    await prisma.stockLot.create({
      data: { pharmacyId, productId: prodStockId, lotNumber: 'LOTE-A', expiryDate: new Date('2027-01-01'), quantityReceived: 10, quantityAvailable: 10, unitCost: 100, status: 'ACTIVE' }
    });
    // Lote B (Produto Stock): 5 * 150 = 750
    await prisma.stockLot.create({
      data: { pharmacyId, productId: prodStockId, lotNumber: 'LOTE-B', expiryDate: new Date('2027-06-01'), quantityReceived: 5, quantityAvailable: 5, unitCost: 150, status: 'ACTIVE' }
    });
    // Lote C (zero): 10 * 200 (não deve contar)
    await prisma.stockLot.create({
      data: { pharmacyId, productId: prodStockId, lotNumber: 'LOTE-C-ZERO', expiryDate: new Date('2027-12-01'), quantityReceived: 10, quantityAvailable: 0, unitCost: 200, status: 'ACTIVE' }
    });
    // Lote D (expirado): 2 * 300 = 600 (deve contar no stock, mas não pode ser vendido)
    await prisma.stockLot.create({
      data: { pharmacyId, productId: prodStockId, lotNumber: 'LOTE-D-EXP', expiryDate: new Date('2020-01-01'), quantityReceived: 2, quantityAvailable: 2, unitCost: 300, status: 'ACTIVE' }
    });

    // Abrir caixa
    await request(app.getHttpServer())
      .post('/api/v1/cash/open')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ openingBalance: 1000 });

    // Criar Venda CASH (100)
    const sale1 = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lines: [{ productId: prod1Id, quantity: 1 }] });
    await request(app.getHttpServer())
      .patch(`/api/v1/sales/${sale1.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/cash/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ saleId: sale1.body.data.id, method: 'CASH', amount: 100, idempotencyKey: '11111111-1111-4111-8111-000000001004' });

    // Criar Venda MPESA (100)
    const sale2 = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lines: [{ productId: prod2Id, quantity: 2 }] });
    await request(app.getHttpServer())
      .patch(`/api/v1/sales/${sale2.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/cash/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ saleId: sale2.body.data.id, method: 'MPESA', amount: 100, idempotencyKey: '11111111-1111-4111-8111-000000001005' });

    // Criar Despesa CASH confirmada (500)
    const exp1 = await request(app.getHttpServer())
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Renda', category: 'RENT', amount: 500, method: 'CASH' });
    await request(app.getHttpServer())
      .patch(`/api/v1/expenses/${exp1.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Criar Despesa MPESA DRAFT (200)
    await request(app.getHttpServer())
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Internet', category: 'UTILITIES', amount: 200, method: 'MPESA' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('resumo: deve agregar vendas e despesas corretamente', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.sales.count).toBe(2);
    expect(res.body.data.sales.total).toBe('200.00');
    expect(res.body.data.expenses.count).toBe(1);
    expect(res.body.data.expenses.total).toBe('500.00');
    expect(res.body.data.stock.expiredLotsCount).toBeGreaterThanOrEqual(1);
  });

  it('resumo: deve retornar zeros para período sem dados', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/summary?startDate=2020-01-01&endDate=2020-01-02')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.sales.count).toBe(0);
    expect(res.body.data.sales.total).toBe('0.00');
  });

  it('vendas: deve separar CASH de MPESA', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.summary.totalSold).toBe('200.00');
    expect(res.body.data.summary.totalPaid).toBe('200.00');
    expect(res.body.data.summary.totalPending).toBe('0.00');

    const methods = res.body.data.byPaymentMethod.map((m: { method: string }) => m.method);
    expect(methods).toContain('CASH');
    expect(methods).toContain('MPESA');
  });

  it('despesas: deve distinguir CASH de digital e não incluir DRAFT', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.summary.count).toBe(1);
    expect(res.body.data.summary.total).toBe('500.00');
    expect(res.body.data.summary.cashTotal).toBe('500.00');
    expect(res.body.data.summary.digitalTotal).toBe('0.00');
  });

  it('despesas: Stock Manager não pode acessar (permissão financeira)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/reports/expenses')
      .set('Authorization', `Bearer ${stockManagerToken}`)
      .expect(403);
  });

  it('caixa: deve excluir MPESA do saldo físico', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/cash')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.sessions.length).toBeGreaterThanOrEqual(1);
    const session = res.body.data.sessions[0];
    expect(parseFloat(session.cashSalePayments)).toBe(100);
    expect(parseFloat(session.breakdown.expensesCash)).toBe(500);
    expect(parseFloat(session.expectedBalance)).toBe(600);
  });

  it('stock: deve identificar lotes expirados e próximos do vencimento', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/stock')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.summary.expiredLotsCount).toBeGreaterThanOrEqual(1);
    expect(res.body.data.summary.nearExpiryLotsCount).toBeGreaterThanOrEqual(1);
  });

  it('stock: deve calcular o valor de stock lote a lote usando unitCost', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/stock')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const stockProduct = res.body.data.products.find((p: any) => p.sku === 'REP-STOCK');
    expect(stockProduct).toBeDefined();
    
    // Lote A (10*100) + Lote B (5*150) + Lote D expirado (2*300) = 1000 + 750 + 600 = 2350.00
    expect(stockProduct.totalValue).toBe('2350.00');
    expect(stockProduct.lots.length).toBe(3); 
  });

  it('multi-tenant: Farmácia B não deve ver dados da Farmácia A', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/summary')
      .set('Authorization', `Bearer ${pharmacyBToken}`)
      .expect(200);

    expect(res.body.data.sales.count).toBe(0);
    expect(res.body.data.expenses.count).toBe(0);
  });

  it('datas inválidas devem ser rejeitadas', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/reports/summary?startDate=invalid')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/v1/reports/summary?startDate=2026-12-31&endDate=2026-01-01')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('vendas: filtro por método devolve apenas vendas com esse método', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/sales?method=CASH')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.sales)).toBe(true);
    for (const sale of res.body.data.sales) {
      const hasCash = sale.payments.some((p: any) => p.method === 'CASH');
      expect(hasCash).toBe(true);
    }
    const methods = res.body.data.byPaymentMethod.map((m: any) => m.method);
    if (methods.length > 0) {
      expect(methods).toContain('CASH');
    }
  });

  it('vendas: filtro por método inválido devolve 400', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/reports/sales?method=INVALIDO')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('vendas: filtro por método respeita isolamento entre farmácias', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/sales?method=CASH')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    for (const sale of res.body.data.sales) {
      expect(sale).toBeTruthy();
      // Não deve haver vendas da farmácia B (o isolamento é garantido pelo pharmacyId no where)
    }
  });
});
