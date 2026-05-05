// src/main.ts
import { NestFactory }          from '@nestjs/core';
import { ValidationPipe }       from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as helmet              from 'helmet';
import * as compression         from 'compression';
import { AppModule }            from './app.module';
import { AllExceptionsFilter }  from './common/filters/http-exception.filter';
import { ResponseInterceptor }  from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  // ── Security headers ──────────────────────────────────────────────────────
  app.use((helmet as any)());
  app.use((compression as any)());

  // ── CORS (allowlist your Expo / web app origins) ──────────────────────────
  app.enableCors({
    origin:      process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:8081'],
    credentials: true,
  });

  // ── Global validation pipe (whitelist + no extra properties) ─────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
    }),
  );

  // ── Global response envelope + exception filter ───────────────────────────
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // ── Swagger API docs (available at /api/docs) ─────────────────────────────
  const swagger = new DocumentBuilder()
    .setTitle('Hotel Management System API')
    .setDescription('RESTful API for HMS v1')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🏨  HMS Backend running on http://localhost:${port}`);
  console.log(`📖  Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
