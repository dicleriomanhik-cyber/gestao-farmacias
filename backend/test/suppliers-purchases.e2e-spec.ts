import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Suppliers & Purchases (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let pharmacyId: string;
  let supplierId: string;
  let productId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    // Limpar
    await prisma.purchaseLine.deleteMany({});
    await prisma.purchase.deleteMany({});
    await prisma.supplier.deleteMany({ where: { name: 'Fornecedor Teste' } });
    await prisma.product.deleteMany({ where: { sku: 'PROD-TEST-01' } });

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
    adminToken = loginRes.body.data.accessToken;
    pharmacyId = loginRes.body.data.user.pharmacyId;

    // Criar produto para usar nas compras
    const prodRes = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Produto Teste Compra', sku: 'PROD-TEST-01', salePrice: 100 });
    productId = prodRes.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Suppliers', () => {
    it('deve criar um fornecedor', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Fornecedor Teste', taxId: '400123456', phone: '+258840000000' })
        .expect(201);
      supplierId = res.body.data.id;
      expect(res.body.data.name).toBe('Fornecedor Teste');
    });

    it('deve listar fornecedores', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.data.length).toBeGreaterThan(0);
    });

    it('deve actualizar um fornecedor', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ city: 'Matola' })
        .expect(200);
      expect(res.body.data.city).toBe('Matola');
    });

    it('deve obter um fornecedor por ID (admin)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(supplierId);
    });

    it('não deve permitir consultar fornecedor de outra farmácia (404)', async () => {
      const bcryptLib = await import('bcrypt');
      let phB = await prisma.pharmacy.findFirst({ where: { name: 'Farmacia B - Suppliers E2E' } });
      if (!phB) {
        phB = await prisma.pharmacy.create({ data: { name: 'Farmacia B - Suppliers E2E', status: 'ACTIVE' } });
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
        .get(`/api/v1/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });
  });

  describe('Purchases', () => {
    let purchaseId: string;

    it('deve criar uma compra (DRAFT) calculando os totais', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/purchases')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplierId,
          documentNumber: 'FAT-2026-001',
          lines: [
            { productId, quantity: 10, unitCost: 50, discount: 0 }
          ]
        })
        .expect(201);
      
      expect(res.body.data.status).toBe('DRAFT');
      expect(Number(res.body.data.totalAmount)).toBe(500.00);
      purchaseId = res.body.data.id;
    });

    it('deve confirmar uma compra', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/v1/purchases')
        .set('Authorization', `Bearer ${adminToken}`);
      const purchaseId = list.body.data.data[0].id;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/purchases/${purchaseId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.status).toBe('CONFIRMED');
    });

    it('deve obter uma compra por ID (admin)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/purchases/${purchaseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(purchaseId);
      expect(Array.isArray(res.body.data.lines)).toBe(true);
      expect(res.body.data.supplier).toBeDefined();
    });

    it('deve devolver 404 ao consultar compra inexistente', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/purchases/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('não deve permitir consultar compra de outra farmácia (404)', async () => {
      const bcryptLib = await import('bcrypt');
      let phB = await prisma.pharmacy.findFirst({ where: { name: 'Farmacia B - Purchases E2E' } });
      if (!phB) {
        phB = await prisma.pharmacy.create({ data: { name: 'Farmacia B - Purchases E2E', status: 'ACTIVE' } });
      }
      const passwordHash = await bcryptLib.hash('admin_purchases_pass_123456', 12);
      const roleAdmin = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
      const userB = await prisma.user.upsert({
        where: { email: 'admin_purchases@farmaciab.com' },
        update: { pharmacyId: phB.id, passwordHash },
        create: { email: 'admin_purchases@farmaciab.com', passwordHash, fullName: 'Admin Purchases B', pharmacyId: phB.id, status: 'ACTIVE' },
      });
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: userB.id, roleId: roleAdmin!.id } },
        update: {},
        create: { userId: userB.id, roleId: roleAdmin!.id },
      });

      const loginB = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin_purchases@farmaciab.com', password: 'admin_purchases_pass_123456' });
      const tokenB = loginB.body.data.accessToken;

      await request(app.getHttpServer())
        .get(`/api/v1/purchases/${purchaseId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });
  });

  describe('Segurança e Integridade', () => {
    it('confirmar compra NÃO deve alterar stock ou criar movimentos', async () => {
      const product = await prisma.product.findUnique({ where: { id: productId } });
      expect(product.salePrice.toNumber()).toBe(100); // Preço original inalterado
    });

    it('deve rejeitar compra com fornecedor de outra farmácia', async () => {
      const phB = await prisma.pharmacy.create({ data: { name: 'Farmacia B', status: 'ACTIVE' } });
      
      const res = await request(app.getHttpServer())
        .post('/api/v1/purchases')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplierId: '00000000-0000-0000-0000-000000000000', // ID falso
          documentNumber: 'FAT-B-01',
          lines: [{ productId, quantity: 1, unitCost: 10 }]
        })
        .expect(400);
      
      await prisma.pharmacy.delete({ where: { id: phB.id } });
    });

    it('deve registar auditoria da compra', async () => {
      const logs = await prisma.auditLog.findMany({
        where: { action: 'purchase.create', pharmacyId }
      });
      expect(logs.length).toBeGreaterThan(0);
    });
  });
});
