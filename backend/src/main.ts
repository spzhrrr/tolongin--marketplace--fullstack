import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { getCorsOrigins } from './common/utils/cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());

  // Increase body size limit for base64 avatar uploads (up to ~5MB)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  const isProduction = process.env.NODE_ENV === 'production';

  // Konfigurasi CORS terpusat (lihat common/utils/cors.ts)
  const corsOptions = getCorsOrigins();

  app.enableCors({
    origin: corsOptions,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Cookie',
    ],
    exposedHeaders: ['Authorization', 'Set-Cookie'],
  });

  app.setGlobalPrefix('api');

  // Static files for uploaded images — served at /api/uploads/* so the
  // platform ingress (which proxies /api/* to the backend) can reach them.
  // Use absolute path to avoid CWD ambiguity in different runtime modes.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodePath = require('path');
  const uploadsAbs = nodePath.resolve(process.cwd(), 'uploads');
  app.use('/api/uploads', express.static(uploadsAbs, { maxAge: '7d' }));
  app.use('/uploads', express.static(uploadsAbs, { maxAge: '7d' }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector), new RolesGuard(reflector));

  // Swagger - Always enabled for dev/testing, check SWAGGER_ENABLED in production
  if (!isProduction || process.env.SWAGGER_ENABLED === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Tolongin API')
      .setDescription(
        'Marketplace jasa & pekerjaan Indonesia — REST + WebSocket API',
      )
      .setVersion('2.0.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'jwt',
      )
      .addTag('Auth', 'Registration, login, refresh, logout & password reset')
      .addTag('Users', 'Public user profiles & seller info')
      .addTag('Categories', 'Service & job categories')
      .addTag('Services', 'Marketplace service listings')
      .addTag('Jobs', 'Job postings from buyers')
      .addTag('Applications', 'Seller applications to jobs')
      .addTag('Orders', 'Order lifecycle & state machine')
      .addTag('Reviews', 'Service & seller reviews')
      .addTag('Payments', 'Order payments & webhooks')
      .addTag('Withdrawals', 'Seller withdrawals & bank accounts')
      .addTag('Chat', 'Real-time chat (REST + WebSocket)')
      .addTag('Notifications', 'User notifications')
      .addTag('Disputes', 'Order disputes')
      .addTag('Admin', 'Admin dashboard & management')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = process.env.PORT
    ? parseInt(process.env.PORT as string, 10)
    : 8001;

  await app.listen(port, '0.0.0.0');

  logger.log(`✅ Tolongin backend is running!`);
  logger.log(`📍 API: http://localhost:${port}/api`);
  logger.log(`📚 Swagger UI: http://localhost:${port}/api/docs`);
}
bootstrap();
