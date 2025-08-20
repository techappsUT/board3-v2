import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { Logger as NestLogger } from '@nestjs/common';
import compression from 'compression';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    cors: {
      origin:
        process.env.NODE_ENV === 'production'
          ? [process.env.FRONTEND_URL!]
          : ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    },
  });

  const configService = app.get(ConfigService);
  const logger = app.get(Logger);

  // Set global logger
  app.useLogger(logger);

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // Compression middleware
  app.use(compression());

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: process.env.NODE_ENV === 'production',
    })
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  // API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  // Global prefix
  app.setGlobalPrefix('api', {
    exclude: ['health', 'metrics'],
  });

  // Swagger documentation (only in development)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Board3 API')
      .setDescription('AI-powered cloud infrastructure management platform API')
      .setVersion('1.0')
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management endpoints')
      .addTag('projects', 'Project management endpoints')
      .addTag('designs', 'Design management endpoints')
      .addTag('terraform', 'Terraform operations endpoints')
      .addTag('ai', 'AI-powered features endpoints')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth'
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'Board3 API Documentation',
      customfavIcon: '/favicon.ico',
      customCss: '.swagger-ui .topbar { display: none }',
    });
  }

  // Get port from config
  const port = configService.get<number>('PORT', 3001);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`🚀 Application is running on: http://${host}:${port}`);
  logger.log(`📚 API Documentation available at: http://${host}:${port}/api/docs`);
  logger.log(`🔍 Health check available at: http://${host}:${port}/health`);
  logger.log(`📊 Metrics available at: http://${host}:${port}/metrics`);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  const logger = new NestLogger('Main');
  logger.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  const logger = new NestLogger('Main');
  logger.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

bootstrap().catch((error) => {
  const logger = new NestLogger('Main');
  logger.error('Failed to start application:', error);
  process.exit(1);
});
