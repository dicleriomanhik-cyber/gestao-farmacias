// @ts-nocheck
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Pharmacy (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    // Login como admin
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
    
    adminToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve obter a farmácia autenticada', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/pharmacy')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data).toHaveProperty('name');
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('deve rejeitar acesso sem token', async () => {
    await request(app.getHttpServer()).get('/api/v1/pharmacy').expect(401);
  });

  it('deve actualizar dados da farmácia e registar auditoria', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/pharmacy')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ city: 'Matola', phone: '+258840000000' })
      .expect(200);
    
    expect(res.body.data.city).toBe('Matola');

    // Confirma auditoria
    const logs = await prisma.auditLog.findMany({
      where: { action: 'pharmacy.update', entityId: res.body.data.id }
    });
    expect(logs.length).toBeGreaterThan(0);
  });

  it('deve rejeitar campos inválidos', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/pharmacy')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'email-invalido' })
      .expect(400);
  });
});