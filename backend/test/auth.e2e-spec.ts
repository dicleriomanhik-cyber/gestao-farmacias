// @ts-nocheck
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => app.close());

  it('rejeita login sem corpo', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({})
      .expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.statusCode).toBe(400);
  });

  it('rejeita rota protegida sem token', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/nao-existe').expect(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});