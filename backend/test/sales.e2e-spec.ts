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

  it('deve obter uma venda por ID (admin)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/sales/${saleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(saleId);
  });

  it('não deve permitir consultar venda de outra farmácia (404)', async () => {
    const bcryptLib = await import('bcrypt');
    let phB = await prisma.pharmacy.findFirst({ where: { name: 'Farmacia B - Sales E2E' } });
    if (!phB) {
      phB = await prisma.pharmacy.create({ data: { name: 'Farmacia B - Sales E2E', status: 'ACTIVE' } });
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
      .get(`/api/v1/sales/${saleId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
  });
});
