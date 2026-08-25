import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const frontendUrl = configService.get<string>('gateway.frontendUrl')!;
  const adminFrontendUrl = configService.get<string>('gateway.adminFrontendUrl')!;

  // CORS สำหรับ Frontend (main + admin subdomain)
  app.enableCors({
    origin: [frontendUrl, adminFrontendUrl].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Only meaningful once AdminIpGuard is actually enabled — trusts N hops of
  // x-forwarded-for (e.g. behind Cloudflare/ALB) so req.ip isn't spoofable.
  if (configService.get<string>('ADMIN_IP_ALLOWLIST_ENABLED') === 'true') {
    app.set('trust proxy', configService.get<number>('gateway.trustProxyHops'));
  }

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Response Transform
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger API Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Comp Active API')
    .setDescription('API สำหรับระบบจัดการกิจกรรม (Event Management System) - วิทยาลัยการคอมพิวเตอร์')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'x-api-key')
    .addTag('Authentication', 'การยืนยันตัวตน (Login, Register, Admin Invite)')
    .addTag('Users', 'จัดการผู้ใช้งาน')
    .addTag('Activities', 'จัดการกิจกรรม')
    .addTag('Registrations', 'การลงทะเบียนกิจกรรม')
    .addTag('Certificates', 'เกียรติบัตร')
    .addTag('Admin Dashboard', 'สำหรับผู้ดูแลระบบ: สถิติ, Landing Page, คำขอ Organizer')
    .addTag('Developer Portal', 'API Key และ Public Developer API')
    .build();

  // Swagger docs describe internal/admin surfaces too — keep them out of production.
  if (configService.get<string>('NODE_ENV') !== 'production') {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, document, { swaggerOptions: { persistAuthorization: true } });
  }

  await app.listen(port);
  logger.log(`🚀 Server running on http://localhost:${port}`);
  if (configService.get<string>('NODE_ENV') !== 'production') {
    logger.log(`📖 Swagger docs: http://localhost:${port}/api`);
  }
  logger.log(`🌐 CORS enabled for: ${[frontendUrl, adminFrontendUrl].filter(Boolean).join(', ')}`);
}

bootstrap();
