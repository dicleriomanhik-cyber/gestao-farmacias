import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Categories (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let pharmacyAId: string;
  let categoryAId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    // Limpar categorias de teste (idempotente entre execuções)
    await prisma.category.deleteMany({
      where: { name: { in: ['Categoria E2E', 'Categoria E2E Duplicada', 'Categoria B E2E'] } },
    });
    // Limpar farmácia B de testes anteriores
    await prisma.user.deleteMany({ where: { email: 'admin@farmaciab.com' } });
    await prisma.pharmacy.deleteMany({ where: { name: 'Farmacia B - Categories E2E' } });

    // Login como admin da farmácia A
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });

    adminToken = loginRes.body.data.accessToken;
    pharmacyAId = loginRes.body.data.user.pharmacyId;
  });

  afterAll(async () => {
    await prisma.category.deleteMany({
      where: { name: { in: ['Categoria E2E', 'Categoria E2E Duplicada', 'Categoria B E2E'] } },
    });
    await prisma.user.deleteMany({ where: { email: 'admin@farmaciab.com' } });
    await prisma.pharmacy.deleteMany({ where: { name: 'Farmacia B - Categories E2E' } });
    await app.close();
  });

  it('deve rejeitar criação sem autenticação (401)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .send({ name: 'Sem Auth' })
      .expect(401);
  });

  it('deve criar uma categoria válida', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Categoria E2E', description: 'Descrição de teste' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Categoria E2E');
    expect(res.body.data.id).toBeTruthy();
    categoryAId = res.body.data.id;
  });

  it('deve rejeitar categoria duplicada na mesma farmácia (409)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Categoria E2E' })
      .expect(409);
  });

  it('deve rejeitar nome inválido (menos de 2 caracteres) (400)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X' })
      .expect(400);
  });

  it('deve listar as categorias da farmácia (paginado)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('meta');
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(res.body.data.meta).toHaveProperty('total');
    expect(res.body.data.meta).toHaveProperty('page');
    expect(res.body.data.meta).toHaveProperty('limit');
    expect(res.body.data.meta).toHaveProperty('totalPages');

    const found = res.body.data.data.find((c: any) => c.name === 'Categoria E2E');
    expect(found).toBeTruthy();
  });

  it('deve aplicar paginação com page e limit', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/categories?page=1&limit=1')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.meta.page).toBe(1);
    expect(res.body.data.meta.limit).toBe(1);
    expect(res.body.data.data.length).toBeLessThanOrEqual(1);
    expect(res.body.data.meta.total).toBeGreaterThanOrEqual(1);
  });

  it('deve usar valores predefinidos quando page e limit não são enviados', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.meta.page).toBe(1);
    expect(res.body.data.meta.limit).toBe(20);
  });

  it('deve limitar o limit máximo a 100', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/categories?limit=1000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.meta.limit).toBe(100);
  });

  it('deve devolver total e totalPages coerentes', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/categories?limit=1')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const total = res.body.data.meta.total;
    const limit = res.body.data.meta.limit;
    const totalPages = res.body.data.meta.totalPages;
    expect(total).toBeGreaterThanOrEqual(1);
    expect(limit).toBe(1);
    expect(totalPages).toBe(Math.ceil(total / limit));
  });

  it('deve actualizar uma categoria existente', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/categories/${categoryAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Descrição actualizada' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.description).toBe('Descrição actualizada');
  });

  it('deve rejeitar actualização de categoria inexistente (404)', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/categories/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Nada' })
      .expect(404);
  });

  it('deve isolar categorias entre farmácias (farmácia B não vê a da farmácia A)', async () => {
    // Criar farmácia B e admin B
    const passwordHash = await bcrypt.hash('admin_b_pass_123456', 12);
    const phB = await prisma.pharmacy.create({
      data: { name: 'Farmacia B - Categories E2E', status: 'ACTIVE' },
    });
    const roleAdmin = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    const userB = await prisma.user.create({
      data: {
        email: 'admin@farmaciab.com',
        passwordHash,
        fullName: 'Admin B',
        pharmacyId: phB.id,
        status: 'ACTIVE',
      },
    });
    await prisma.userRole.create({ data: { userId: userB.id, roleId: roleAdmin!.id } });

    const loginB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@farmaciab.com', password: 'admin_b_pass_123456' });
    const tokenB = loginB.body.data.accessToken;

    // Listagem da farmácia B não deve conter a categoria da farmácia A
    const listB = await request(app.getHttpServer())
      .get('/api/v1/categories')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    const hasA = listB.body.data.data.some((c: any) => c.name === 'Categoria E2E');
    expect(hasA).toBe(false);
    expect(listB.body.data.meta.total).toBe(0);

    // Farmácia B tenta actualizar categoria da farmácia A → 404
    await request(app.getHttpServer())
      .patch(`/api/v1/categories/${categoryAId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ description: 'Tentativa cross-tenant' })
      .expect(404);
  });
});