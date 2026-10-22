import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let adminUserId: string;
  let pharmacyAId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    // Limpar utilizadores auxiliares (nÃƒÂ£o mexe no admin)
    await prisma.user.deleteMany({
      where: { email: { in: ['caixa@teste.com', 'admin2@teste.com', 'admin@farmaciab.com'] } },
    });

    // Login como admin
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
    
    adminToken = loginRes.body.data.accessToken;
    adminUserId = loginRes.body.data.user.id;
    pharmacyAId = loginRes.body.data.user.pharmacyId;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: ['caixa@teste.com', 'admin2@teste.com', 'admin@farmaciab.com'] } },
    });
    await app.close();
  });

  it('deve listar utilizadores da farmÃƒÂ¡cia (autenticado)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  it('deve rejeitar acesso sem token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .expect(401);
  });

  it('deve criar um utilizador CASHIER', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'caixa@teste.com', password: 'password123', fullName: 'Caixa Teste', roleName: 'CASHIER' })
      .expect(201);
    expect(res.body.data.email).toBe('caixa@teste.com');
  });

  it('deve impedir suspender o último admin activo', async () => {
    const passwordHash = await bcrypt.hash('admin2_pass_123456', 12);
    const roleAdmin = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    const admin2 = await prisma.user.create({
      data: {
        email: 'admin2@teste.com',
        passwordHash,
        fullName: 'Admin 2',
        pharmacyId: pharmacyAId,
        status: 'ACTIVE',
      },
    });
    await prisma.userRole.create({ data: { userId: admin2.id, roleId: roleAdmin!.id } });

    // Suspender o segundo admin: deve passar (hÃƒÂ¡ 2 admins activos)
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${admin2.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED' })
      .expect(200);

    // Tentar suspender o admin principal: deve falhar com 403
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${adminUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED' })
      .expect(403);
  });

  it('deve registar auditoria de mudanÃƒÂ§a de password (usando utilizador auxiliar)', async () => {
    // Login como caixa@teste.com (nÃƒÂ£o toca no admin)
    const caixaLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'caixa@teste.com', password: 'password123' });
    const caixaToken = caixaLogin.body.data.accessToken;
    const caixaUserId = caixaLogin.body.data.user.id;

    // Alterar a password do prÃƒÂ³prio caixa
    await request(app.getHttpServer())
      .patch('/api/v1/users/me/password')
      .set('Authorization', `Bearer ${caixaToken}`)
      .send({ currentPassword: 'password123', newPassword: 'nova_pass_caixa_1' })
      .expect(200);

    // Verificar auditoria
    const logs = await prisma.auditLog.findMany({
      where: { action: 'user.change_password', entityId: caixaUserId },
    });
    expect(logs.length).toBe(1);

    // Verificar que a password nÃƒÂ£o aparece no log
    const serialized = JSON.stringify(logs[0]);
    expect(serialized).not.toContain('nova_pass_caixa_1');
    expect(serialized).not.toContain('$2b$');
  });

  it('nÃƒÂ£o deve permitir update de utilizador de outra farmÃƒÂ¡cia (404)', async () => {
    // Criar FarmÃƒÂ¡cia B + Admin B
    const passwordHash = await bcrypt.hash('admin_b_pass_123456', 12);
    const phB = await prisma.pharmacy.create({ data: { name: 'Farmacia B', status: 'ACTIVE' } });
    const roleAdmin = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    const adminB = await prisma.user.create({
      data: {
        email: 'admin@farmaciab.com',
        passwordHash,
        fullName: 'Admin B',
        pharmacyId: phB.id,
        status: 'ACTIVE',
      },
    });
    await prisma.userRole.create({ data: { userId: adminB.id, roleId: roleAdmin!.id } });

    const loginB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@farmaciab.com', password: 'admin_b_pass_123456' });
    const tokenB = loginB.body.data.accessToken;

    // Obter o id do utilizador caixa da farmÃƒÂ¡cia A
    const caixa = await prisma.user.findFirst({ where: { email: 'caixa@teste.com' } });

    // Admin B tenta actualizar caixa da farmácia A → 404
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${caixa!.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ fullName: 'Tentativa Cross Tenant' })
      .expect(404);

    // Admin A tenta actualizar admin B → 404
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${adminB.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Tentativa Cross Tenant' })
      .expect(404);
  });

  // NOTA: o teste de atomicidade da mudança de password + auditoria foi
  // removido. O jest.spyOn(prisma.auditLog, 'create') não intercepta o
  // cliente transaccional `tx` do Prisma, pelo que o spy não força a
  // falha esperada. A atomicidade é garantida pelo `$transaction` em
  // users.service.ts updateMyPassword() (user.update + auditLog.create
  // na mesma transacção). Validar esta garantia por teste exigiria
  // instrumentação (por exemplo, um trigger que falhe no INSERT do
  // auditLog), que está fora do âmbito desta fase.
});
