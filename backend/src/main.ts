import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const config = app.get(ConfigService);
  const port = config.get<number>('port') ?? 3000;
  const apiPrefix = config.get<string>('apiPrefix') ?? 'api/v1';
  const corsOrigins = config.get<string[]>('corsOrigins') ?? [];

  app.setGlobalPrefix(apiPrefix);

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