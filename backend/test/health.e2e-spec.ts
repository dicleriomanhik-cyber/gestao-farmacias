// @ts-nocheck
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Health (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => app.close());

  it('liveness devolve 200 sem tocar BD', async () => {
    const spy = jest.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('down'));
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body.data.status).toBe('ok');
    spy.mockRestore();
  });

  it('readiness devolve 503 com BD em baixo', async () => {
    const spy = jest.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('down'));
    const res = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(503);
    expect(res.body.data.database).toBe('down');
    spy.mockRestore();
  });
});