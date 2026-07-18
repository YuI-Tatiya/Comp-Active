import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

  // CORS สำหรับ Frontend
  app.enableCors({
    origin: [frontendUrl],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Response Transform
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger API Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Comp Active API')
    .setDescription(
      'API สำหรับระบบจัดการกิจกรรม (Event Management System) - วิทยาลัยการคอมพิวเตอร์',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'การยืนยันตัวตน (Login, Register, Google OAuth)')
    .addTag('Users', 'จัดการผู้ใช้งาน')
    .addTag('Activities', 'จัดการกิจกรรม')
    .addTag('Registrations', 'การลงทะเบียนกิจกรรม')
    .addTag('Certificates', 'เกียรติบัตร')
    .addTag('Admin', 'สำหรับผู้ดูแลระบบ')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  logger.log(`🚀 Server running on http://localhost:${port}`);
  logger.log(`📖 Swagger docs: http://localhost:${port}/api`);
  logger.log(`🌐 CORS enabled for: ${frontendUrl}`);
}

bootstrap();
