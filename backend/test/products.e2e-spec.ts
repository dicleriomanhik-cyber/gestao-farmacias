import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Products & Categories (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let pharmacyId: string;
  let categoryId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    // Limpar
    await prisma.product.deleteMany({ where: { sku: { in: ['TEST-SKU-01', 'TEST-SKU-02', 'HACK-01'] } } });
    await prisma.category.deleteMany({ where: { name: { in: ['Test Category', 'Categoria Exclusiva A'] } } });
    await prisma.user.deleteMany({ where: { email: 'admin@farmaciab.com' } });

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
    
    adminToken = loginRes.body.data.accessToken;
    pharmacyId = loginRes.body.data.user.pharmacyId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Categories', () => {
    it('deve criar uma categoria', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Category', description: 'Desc Teste' })
        .expect(201);
      categoryId = res.body.data.id;
      expect(res.body.data.name).toBe('Test Category');
    });

    it('deve listar as categorias da farmácia', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Products', () => {
    it('deve criar um produto válido', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Produto Teste',
          sku: 'TEST-SKU-01',
          barcode: '999999999',
          salePrice: 100.50,
          categoryId: categoryId
        })
        .expect(201);
      
      expect(res.body.data.name).toBe('Produto Teste');
      expect(res.body.data.pharmacyId).toBe(pharmacyId);
      expect(parseFloat(res.body.data.salePrice)).toBe(100.50);
    });

    it('deve falhar ao criar produto com SKU duplicado', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Produto Duplicado',
          sku: 'TEST-SKU-01',
          salePrice: 200.00
        })
        .expect(409);
    });

    it('deve validar preço negativo', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Produto Barato',
          sku: 'TEST-SKU-02',
          salePrice: -10.00
        })
        .expect(400);
    });

    it('deve pesquisar produtos por nome, SKU e código de barras', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products?search=Produto Teste')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.data.length).toBeGreaterThan(0);
    });

    it('deve filtrar produtos por categoria', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/products?categoryId=${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.data.length).toBe(1);
    });

    it('deve actualizar um produto', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/v1/products?search=TEST-SKU-01')
        .set('Authorization', `Bearer ${adminToken}`);
      const productId = list.body.data.data[0].id;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ salePrice: 120.00 })
        .expect(200);
      expect(parseFloat(res.body.data.salePrice)).toBe(120.00);
    });

    it('deve desactivar um produto (soft delete)', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/v1/products?search=TEST-SKU-01')
        .set('Authorization', `Bearer ${adminToken}`);
      const productId = list.body.data.data[0].id;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INACTIVE' })
        .expect(200);
      expect(res.body.data.status).toBe('INACTIVE');
    });
  });

  describe('Segurança e Auditoria', () => {
    it('deve rejeitar criação de produto sem token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .send({ name: 'Sem Token', salePrice: 10 })
        .expect(401);
    });

    it('deve registar a criação do produto na auditoria', async () => {
      const logs = await prisma.auditLog.findMany({
        where: { action: 'product.create', pharmacyId }
      });
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('Isolamento Multi-Tenant', () => {
    let tokenFarmaciaB: string;
    let pharmacyBId: string;
    let categoryAId: string;

    beforeAll(async () => {
      const pharmacyB = await prisma.pharmacy.create({
        data: { name: 'Farmacia B Teste', status: 'ACTIVE' }
      });
      pharmacyBId = pharmacyB.id;

      const passwordHash = await bcrypt.hash('admin123', 12);
      const roleAdmin = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
      
      const userB = await prisma.user.create({
        data: {
          email: 'admin@farmaciab.com',
          passwordHash,
          fullName: 'Admin B',
          pharmacyId: pharmacyBId,
          status: 'ACTIVE',
        }
      });
      await prisma.userRole.create({
        data: { userId: userB.id, roleId: roleAdmin.id }
      });

      const catA = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Categoria Exclusiva A' })
        .expect(201);
      categoryAId = catA.body.data.id;

      const loginB = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@farmaciab.com', password: 'admin123' })
        .expect(200);
      tokenFarmaciaB = loginB.body.data.accessToken;
    });

    afterAll(async () => {
      await prisma.user.deleteMany({ where: { pharmacyId: pharmacyBId } });
      await prisma.pharmacy.delete({ where: { id: pharmacyBId } });
    });

    it('Farmácia B NÃO deve ver produtos da Farmácia A', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${tokenFarmaciaB}`)
        .expect(200);
      
      expect(res.body.data.data.length).toBe(0);
    });

    it('Farmácia B NÃO deve conseguir usar uma categoria da Farmácia A', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${tokenFarmaciaB}`)
        .send({
          name: 'Produto Ilegal',
          sku: 'HACK-01',
          salePrice: 10,
          categoryId: categoryAId
        })
        .expect(400);
    });
  });
});
