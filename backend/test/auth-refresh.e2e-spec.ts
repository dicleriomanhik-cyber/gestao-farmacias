import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { AuthService } from '../src/modules/auth/auth.service';

/**
 * Requer BD com seed aplicado e um admin criado via CLI.
 * Estes testes autenticam, rotacionam e testam reutilização.
 */
describe('Auth refresh rotation (e2e)', () => {
  let app: INestApplication;
  let auth: AuthService;
  const email = process.env.TEST_ADMIN_EMAIL ?? 'admin@test.local';
  const password = process.env.TEST_ADMIN_PASSWORD ?? '';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    auth = app.get(AuthService);
  });

  afterAll(async () => app.close());

  it('rotaciona refresh e rejeita reutilização do antigo', async () => {
    if (!password) return;
    const login = await auth.login({ email, password }, { ip: '127.0.0.1' });
    const r2 = await auth.refresh(login.refreshToken, { ip: '127.0.0.1' });
    expect(r2.refreshToken).not.toBe(login.refreshToken);
    await expect(auth.refresh(login.refreshToken, { ip: '127.0.0.1' })).rejects.toMatchObject({
      response: { code: 'TOKEN_REUSED' },
    });
  });
});
