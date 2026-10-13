import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
// ใช้ `import * as` ไม่ใช่ default import: tsconfig ไม่ได้เปิด esModuleInterop
// default import จะถูก emit เป็น cookie_parser_1.default ซึ่ง cookie-parser ไม่มี → พังตอน runtime
import * as cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT", 3001);
  const isProduction = configService.get<string>("NODE_ENV") === "production";
  const frontendUrl = configService.get<string>("gateway.frontendUrl")!;
  const adminFrontendUrl = configService.get<string>(
    "gateway.adminFrontendUrl",
  )!;

  // อ่าน JWT จาก httpOnly cookie (ดู common/utils/auth-cookie.util.ts)
  app.use(cookieParser());

  // A02 Security Misconfiguration — security headers ระดับ API
  // สำคัญเป็นพิเศษเพราะ ServeStaticModule เสิร์ฟไฟล์ที่ "ผู้ใช้อัปโหลดเอง" จากโดเมนนี้:
  // nosniff กัน browser เดา content-type แล้วรันไฟล์ที่ถูกอัปมาในนามรูปภาพ
  // crossOriginResourcePolicy ต้องเป็น cross-origin ไม่งั้น app.localhost โหลดรูปจาก
  // api.localhost ไม่ได้ (ค่า default ของ helmet คือ same-origin ซึ่งจะทำให้รูปหายทั้งระบบ)
  app.use(
    helmet({
      contentSecurityPolicy: isProduction
        ? {
            useDefaults: false,
            directives: {
              "default-src": ["'none'"],
              "img-src": ["'self'", "data:"],
              "frame-ancestors": ["'none'"],
              "base-uri": ["'none'"],
              "form-action": ["'none'"],
            },
          }
        : false, // dev: ปิดไว้เพราะ Swagger UI ต้องใช้ inline script/style
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      hsts: isProduction
        ? { maxAge: 63072000, includeSubDomains: true }
        : false,
    }),
  );
  app.getHttpAdapter().getInstance().disable("x-powered-by");

  // A10 Mishandling of Exceptional Conditions — จำกัดขนาด body
  // ค่า default ของ express คือ 100kb แต่ระบุให้ชัดและคุมทุก parser
  // กัน memory DoS จาก payload ยักษ์ (multipart คุมแยกที่ multer limits อยู่แล้ว)
  app.useBodyParser("json", { limit: "512kb" });
  app.useBodyParser("urlencoded", { limit: "512kb", extended: true });

  // ต้องตั้งเสมอ ไม่ใช่เฉพาะตอนเปิด AdminIpGuard — เพราะ rate limiter นับตาม req.ip
  // ถ้าไม่ trust proxy ทุกคำขอที่ผ่าน nginx จะกลายเป็น IP เดียวกัน (IP ของ nginx)
  // ผู้ใช้ทั้งระบบจะแชร์โควตาเดียวกัน = ทั้ง throttle ผิดคนและถูก bypass ได้
  // ค่า n=1 ทำให้ express อ่าน XFF ตัวขวาสุด (ตัวที่ nginx เติมเอง) ค่าที่ client
  // ปลอมมาจะอยู่ทางซ้ายและถูกมองข้าม
  app.set(
    "trust proxy",
    configService.get<number>("gateway.trustProxyHops") ?? 1,
  );

  // CORS สำหรับ Frontend (main + admin subdomain)
  app.enableCors({
    origin: [frontendUrl, adminFrontendUrl].filter(Boolean),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  });

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
    .setTitle("Comp Active API")
    .setDescription(
      "API สำหรับระบบจัดการกิจกรรม (Event Management System) - วิทยาลัยการคอมพิวเตอร์",
    )
    .setVersion("1.0")
    .addBearerAuth()
    .addApiKey({ type: "apiKey", name: "x-api-key", in: "header" }, "x-api-key")
    .addTag("Authentication", "การยืนยันตัวตน (Login, Register, Admin Invite)")
    .addTag("Users", "จัดการผู้ใช้งาน")
    .addTag("Activities", "จัดการกิจกรรม")
    .addTag("Registrations", "การลงทะเบียนกิจกรรม")
    .addTag("Certificates", "เกียรติบัตร")
    .addTag(
      "Admin Dashboard",
      "สำหรับผู้ดูแลระบบ: สถิติ, Landing Page, คำขอ Organizer",
    )
    .addTag("Developer Portal", "API Key และ Public Developer API")
    .build();

  // Swagger docs describe internal/admin surfaces too — keep them out of production.
  if (configService.get<string>("NODE_ENV") !== "production") {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api", app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port);
  logger.log(`Server running on http://localhost:${port}`);
  if (configService.get<string>("NODE_ENV") !== "production") {
    logger.log(`Swagger docs: http://localhost:${port}/api`);
  }
  logger.log(
    `CORS enabled for: ${[frontendUrl, adminFrontendUrl].filter(Boolean).join(", ")}`,
  );
}

bootstrap();
