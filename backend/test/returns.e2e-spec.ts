import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Returns (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let saleId: string;
  let saleLineId: string;
  let returnId: string;
  let returnLineId: string;
  let salePaymentId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

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
    await prisma.product.deleteMany({ where: { sku: 'RET-TEST-01' } });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
    adminToken = loginRes.body.data.accessToken;
    const pharmacyId = loginRes.body.data.user.pharmacyId;

    const prod = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Produto Ret', sku: 'RET-TEST-01', salePrice: 100 });
    
    await prisma.stockLot.create({
      data: {
        pharmacyId,
        productId: prod.body.data.id,
        lotNumber: 'LOTE-RET-01',
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
      .send({ lines: [{ productId: prod.body.data.id, quantity: 5 }] });
    
    await request(app.getHttpServer())
      .patch(`/api/v1/sales/${saleRes.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);

    saleId = saleRes.body.data.id;
    saleLineId = saleRes.body.data.lines[0].id;

    const openCash = await request(app.getHttpServer())
      .post('/api/v1/cash/open')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ openingBalance: 1000 });
    
    const paymentRes = await request(app.getHttpServer())
      .post('/api/v1/cash/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ saleId, method: 'MPESA', amount: 500, idempotencyKey: '11111111-1111-4111-8111-000000001006' });
    salePaymentId = paymentRes.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve criar uma devolução DRAFT', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/returns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        saleId,
        reason: 'Teste',
        lines: [{ saleLineId, quantity: 2, lotNumber: 'LOTE-RET-01', expiryDate: '2027-12-31' }]
      })
      .expect(201);
    
    returnId = res.body.data.id;
    expect(res.body.data.status).toBe('DRAFT');
    expect(parseFloat(res.body.data.totalRefund)).toBe(200);
    
    const lines = await prisma.saleReturnLine.findMany({ where: { returnId } });
    returnLineId = lines[0].id;
  });

  it('deve confirmar a devolução e criar quarentena', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/returns/${returnId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    
    expect(res.body.data.status).toBe('CONFIRMED');
    
    const q = await prisma.quarantineStock.findFirst({ where: { saleReturnLineId: returnLineId } });
    expect(q.quantityReceived).toBe(2);
    expect(q.status).toBe('PENDING_INSPECTION');
  });

  it('deve listar artigos em quarentena', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/returns/quarantine')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.data.length).toBeGreaterThan(0);
  });

  it('deve impedir libertação sem lote/validade verificáveis', async () => {
    // Simular que o lote foi desconhecido
    await prisma.quarantineStock.updateMany({
      where: { saleReturnLineId: returnLineId },
      data: { lotNumber: 'DESCONHECIDO', expiryDate: new Date('2099-12-31') }
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/returns/${returnId}/lines/${returnLineId}/inspect`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ condition: 'RESELLABLE', quantityToRelease: 1 })
      .expect(400);
  });

  it('deve inspecionar e libertar 1 unidade', async () => {
    // Restaurar lote válido
    await prisma.quarantineStock.updateMany({
      where: { saleReturnLineId: returnLineId },
      data: { lotNumber: 'LOTE-RET-01', expiryDate: new Date('2027-12-31') }
    });

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/returns/${returnId}/lines/${returnLineId}/inspect`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ condition: 'RESELLABLE', quantityToRelease: 1 })
      .expect(200);
    
    const q = await prisma.quarantineStock.findFirst({ where: { saleReturnLineId: returnLineId } });
    expect(q.quantityReleased).toBe(1);
    expect(q.quantityInspected).toBe(1);
  });

  it('deve impedir reembolso superior ao valor da linha de devolução', async () => {
    // Linha de devolução é 200 (2 x 100). Tentar reembolsar 300 deve falhar.
    await request(app.getHttpServer())
      .post(`/api/v1/returns/${returnId}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        returnLineId: returnLineId,
        salePaymentId: salePaymentId,
        method: 'MPESA',
        amount: 300,
      })
      .expect(400);
  });

  it('deve registar um reembolso MPESA pendente de 100', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/returns/${returnId}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        returnLineId: returnLineId,
        salePaymentId: salePaymentId,
        method: 'MPESA',
        amount: 100,
      })
      .expect(201);
    
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.method).toBe('MPESA');
  });

  it('deve impedir reembolso que exceda o saldo restante da linha', async () => {
    // Já reembolsamos 100. A linha é 200. Tentar mais 150 deve falhar (100+150=250 > 200).
    await request(app.getHttpServer())
      .post(`/api/v1/returns/${returnId}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        returnLineId: returnLineId,
        salePaymentId: salePaymentId,
        method: 'MPESA',
        amount: 150,
      })
      .expect(400);
  });

  it('deve confirmar manualmente o reembolso MPESA', async () => {
    const refunds = await prisma.returnRefund.findMany({ where: { returnLineId: returnLineId } });
    const refundId = refunds[0].id;

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/returns/refunds/${refundId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'COMPLETED',
        externalReference: 'MPESA-REF-2026-001',
        notes: 'Confirmado manualmente',
      })
      .expect(200);
    
    expect(res.body.data.status).toBe('COMPLETED');
    expect(res.body.data.externalReference).toBe('MPESA-REF-2026-001');
  });

  it('deve obter uma devolução por ID (admin)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/returns/${returnId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(returnId);
  });

  it('não deve permitir consultar devolução de outra farmácia (404)', async () => {
    const bcryptLib = await import('bcrypt');
    const nomeFarmaciaB = 'Farmacia B - Returns E2E';
    let phB = await prisma.pharmacy.findFirst({ where: { name: nomeFarmaciaB } });
    if (!phB) {
      phB = await prisma.pharmacy.create({ data: { name: nomeFarmaciaB, status: 'ACTIVE' } });
    }
    const passwordHash = await bcryptLib.hash('admin_b_pass_123456', 12);
    const roleAdmin = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    const userB = await prisma.user.upsert({
      where: { email: 'admin@farmaciab.com' },
      update: { pharmacyId: phB.id, passwordHash },
      create: { email: 'admin@farmaciab.com', passwordHash, fullName: 'Admin B', pharmacyId: phB.id, status: 'ACTIVE' },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: userB.id, roleId: roleAdmin!.id } },
      update: {},
      create: { userId: userB.id, roleId: roleAdmin!.id },
    });

    const loginB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@farmaciab.com', password: 'admin_b_pass_123456' });
    const tokenB = loginB.body.data.accessToken;

    await request(app.getHttpServer())
      .get(`/api/v1/returns/${returnId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
  });

  it('deve rejeitar GET /returns/:id sem token (401)', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/returns/${returnId}`)
      .expect(401);
  });
});
