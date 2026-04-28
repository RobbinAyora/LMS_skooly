import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global API prefix
  app.setGlobalPrefix('api');

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
}

bootstrap();
