import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import * as express from 'express';
import { ValidationPipe, BadRequestException } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Increase body size limit (for base64 thumbnails etc.)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // ================================
  // ✅ ADD THIS: GLOBAL VALIDATION PIPE
  // (THIS SHOWS MISSING FIELDS)
  // ================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        console.log('❌ VALIDATION ERRORS:', JSON.stringify(errors, null, 2));

        return new BadRequestException({
          message: 'Validation failed',
          errors,
        });
      },
    }),
  );

  // Global API prefix
  app.setGlobalPrefix('api');

  // Apply global response formatting
  app.useGlobalInterceptors(new ResponseInterceptor());

  // ================================
  // ⚠️ KEEP FILTER LAST
  // ================================
  app.useGlobalFilters(new AllExceptionsFilter());

  // CORS configuration (production-ready)
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://132.145.136.159',
      'http://132.145.136.159:3000',
      'http://132.145.136.159:5173',
      'https://lms-frontend-five-khaki.vercel.app',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT || 5000;

  // IMPORTANT: bind to 0.0.0.0 for Docker
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Server running on port ${port}`);
  console.log(`📡 API available at /api`);
  console.log(`📦 Response format: { success, data, message? }`);
}

bootstrap();
