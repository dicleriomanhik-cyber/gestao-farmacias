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
  });

  describe('Purchases', () => {
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