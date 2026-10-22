import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Expenses (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let stockManagerToken: string;
  let pharmacyBToken: string;
  let expenseId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    // Limpar
    await prisma.salePayment.deleteMany({});
    await prisma.cashMovement.deleteMany({});
    await prisma.expense.deleteMany({});
    await prisma.cashSession.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.user.deleteMany({ where: { email: { in: ['stock@teste.com', 'admin@farmaciab.com'] } } });

    // Login Admin
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
    adminToken = loginRes.body.data.accessToken;
    const pharmacyId = loginRes.body.data.user.pharmacyId;

    // Criar Stock Manager
    const passwordHash = await bcrypt.hash('admin123', 12);
    const roleStock = await prisma.role.findUnique({ where: { name: 'STOCK_MANAGER' } });
    const stockUser = await prisma.user.create({
      data: { email: 'stock@teste.com', passwordHash, fullName: 'Stock Manager', pharmacyId, status: 'ACTIVE' }
    });
    await prisma.userRole.create({ data: { userId: stockUser.id, roleId: roleStock.id } });

    const stockLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'stock@teste.com', password: 'admin123' });
    stockManagerToken = stockLogin.body.data.accessToken;

    // Criar Farmácia B e Admin B
    const phB = await prisma.pharmacy.create({ data: { name: 'Farmacia B', status: 'ACTIVE' } });
    const roleAdmin = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    const userB = await prisma.user.create({
      data: { email: 'admin@farmaciab.com', passwordHash, fullName: 'Admin B', pharmacyId: phB.id, status: 'ACTIVE' }
    });
    await prisma.userRole.create({ data: { userId: userB.id, roleId: roleAdmin.id } });

    const loginB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@farmaciab.com', password: 'admin123' });
    pharmacyBToken = loginB.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve criar uma despesa DRAFT (Admin)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Renda', category: 'RENT', amount: 5000, method: 'CASH' })
      .expect(201);
    
    expenseId = res.body.data.id;
    expect(res.body.data.status).toBe('DRAFT');
  });

  it('deve impedir criação por Stock Manager (permissão)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${stockManagerToken}`)
      .send({ description: 'Teste', category: 'OTHER', amount: 100, method: 'CASH' })
      .expect(403);
  });

  it('deve impedir consulta por Farmácia B (isolamento)', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${pharmacyBToken}`)
      .expect(404);
  });

  it('deve registar auditoria da criação', async () => {
    const logs = await prisma.auditLog.findMany({ where: { action: 'expense.create', entityId: expenseId } });
    expect(logs.length).toBe(1);
  });

  it('deve impedir confirmação CASH sem caixa aberta', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/expenses/${expenseId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('deve confirmar despesa CASH com caixa aberta', async () => {
    // Abrir caixa
    await request(app.getHttpServer())
      .post('/api/v1/cash/open')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ openingBalance: 10000 })
      .expect(201);

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/expenses/${expenseId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    
    expect(res.body.data.status).toBe('CONFIRMED');
    
    const movement = await prisma.cashMovement.findFirst({ where: { expenseId } });
    expect(movement).toBeTruthy();
    expect(movement.type).toBe('OUT');
  });

  it('deve ser idempotente em confirmação repetida (não duplica cashMovement)', async () => {
    const before = await prisma.cashMovement.count({ where: { expenseId } });
    expect(before).toBe(1);

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/expenses/${expenseId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.status).toBe('CONFIRMED');
    const after = await prisma.cashMovement.count({ where: { expenseId } });
    expect(after).toBe(1);
  });

  it('deve registar auditoria da confirmação (uma única vez)', async () => {
    const logs = await prisma.auditLog.findMany({ where: { action: 'expense.confirm', entityId: expenseId } });
    expect(logs.length).toBe(1);
  });

  it('deve testar concorrência real entre Confirmação de Despesa e Fecho de Caixa', async () => {
    // Limpar e abrir nova sessão
    await prisma.cashMovement.deleteMany({});
    await prisma.cashSession.deleteMany({});
    
    const openRes = await request(app.getHttpServer())
      .post('/api/v1/cash/open')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ openingBalance: 10000 })
      .expect(201);
    const sessionId = openRes.body.data.id;

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Teste Concorrência', category: 'OTHER', amount: 500, method: 'CASH' })
      .expect(201);
    const concExpenseId = createRes.body.data.id;

    const [confirmRes, closeRes] = await Promise.all([
      request(app.getHttpServer())
        .patch(`/api/v1/expenses/${concExpenseId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`),
      request(app.getHttpServer())
        .patch(`/api/v1/cash/${sessionId}/close`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ countedBalance: 9500 })
    ]);

    expect(closeRes.status).toBe(200);
    
    const closedSession = await prisma.cashSession.findUnique({ where: { id: sessionId } });
    const expense = await prisma.expense.findUnique({ where: { id: concExpenseId } });
    const movements = await prisma.cashMovement.findMany({ where: { expenseId: concExpenseId } });

    if (confirmRes.status === 200) {
      expect(expense.status).toBe('CONFIRMED');
      expect(movements.length).toBe(1);
      expect(closedSession.expectedBalance?.toNumber()).toBe(9500);
    } else {
      expect(expense.status).toBe('DRAFT');
      expect(movements.length).toBe(0);
      expect(closedSession.expectedBalance?.toNumber()).toBe(10000);
    }
  });

  it('deve ser idempotente em confirmações concorrentes da mesma despesa', async () => {
    // Abrir nova sessão (a anterior foi fechada)
    const openRes = await request(app.getHttpServer())
      .post('/api/v1/cash/open')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ openingBalance: 10000 })
      .expect(201);
    expect(openRes.body.data.id).toBeTruthy();

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Concorrência idempotente', category: 'OTHER', amount: 250, method: 'CASH' })
      .expect(201);
    const id = createRes.body.data.id;

    const [r1, r2] = await Promise.all([
      request(app.getHttpServer()).patch(`/api/v1/expenses/${id}/confirm`).set('Authorization', `Bearer ${adminToken}`),
      request(app.getHttpServer()).patch(`/api/v1/expenses/${id}/confirm`).set('Authorization', `Bearer ${adminToken}`),
    ]);

    expect([r1.status, r2.status].every(s => s === 200 || s === 409)).toBe(true);

    const expense = await prisma.expense.findUnique({ where: { id } });
    expect(expense.status).toBe('CONFIRMED');
    const movements = await prisma.cashMovement.findMany({ where: { expenseId: id } });
    expect(movements.length).toBe(1);
  });
});