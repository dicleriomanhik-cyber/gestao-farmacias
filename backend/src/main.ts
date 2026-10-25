import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'fs';
import { join, isAbsolute, resolve } from 'path';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  const config = app.get(ConfigService);
  const port = config.get<number>('port') ?? 3000;
  const apiPrefix = config.get<string>('apiPrefix') ?? 'api/v1';
  const corsOrigins = config.get<string[]>('corsOrigins') ?? [];

  app.setGlobalPrefix(apiPrefix);

  // Servir o build do Front-end (opcional)
  const rawDist = config.get<string>('frontendDistPath') ?? 'frontend/dist';
  const baseDir = process.cwd().endsWith('backend')
    ? resolve(process.cwd(), '..')
    : process.cwd();
  const frontendDist = isAbsolute(rawDist) ? rawDist : resolve(baseDir, rawDist);

  if (existsSync(frontendDist)) {
    app.useStaticAssets(frontendDist);
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.get(/^\/(?!api\/).*/, (req: any, res: any, next: any) => {
      if (req.method !== 'GET') return next();
      if (/\.[a-z0-9]+$/i.test(req.path)) return next();
      if (!req.accepts('html')) return next();
      res.sendFile(join(frontendDist, 'index.html'));
    });
    Logger.log(`Frontend: ${frontendDist}`, 'Bootstrap');
  } else {
    Logger.warn(`Frontend dist não encontrado em ${frontendDist}. Apenas API será servida.`, 'Bootstrap');
  }

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({ origin: corsOrigins.length > 0 ? corsOrigins : false });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('API — Gestão de Farmácias (Moçambique)')
    .setDescription('Fundação técnica. Autenticação com refresh rotativo, permissões explícitas e isolamento por farmácia.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  SwaggerModule.setup(
    `${apiPrefix}/docs`,
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(port);
  Logger.log(`API: http://localhost:${port}/${apiPrefix}`, 'Bootstrap');
  Logger.log(`Swagger: http://localhost:${port}/${apiPrefix}/docs`, 'Bootstrap');
}

bootstrap().catch((err) => {
  console.error('Falha ao iniciar aplicação:', err);
  process.exit(1);
});