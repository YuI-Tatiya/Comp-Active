import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { join } from "path";
import { PrismaModule } from "./prisma/prisma.module";
import jwtConfig from "./config/jwt.config";
import databaseConfig from "./config/database.config";
import gatewayConfig from "./config/gateway.config";

// Role modules (own the role-specific controllers)
import { AdminModule } from "./modules/admin/admin.module";
import { OrganizerModule } from "./modules/organizer/organizer.module";
import { StudentModule } from "./modules/student/student.module";

// Shared modules with their own public/cross-role controllers
import { AuthModule } from "./modules/shared/auth/auth.module";
import { SeedModule } from "./modules/shared/seed/seed.module";

// Shared "public" modules — see activities-public.module.ts for why these are
// imported directly here (not via Admin/Organizer/Student) and MUST be listed
// after those three: they host a bare `GET /:id` route that would otherwise
// register before the role modules' own literal-path routes (e.g. `/pending`,
// `/my`) and swallow them.
import { ActivitiesPublicModule } from "./modules/shared/activities/activities-public.module";
import { EventsPublicModule } from "./modules/shared/events/events-public.module";
import { VolunteerServicesPublicModule } from "./modules/shared/volunteer-services/volunteer-services-public.module";
import { ChatbotModule } from "./modules/shared/chatbot/chatbot.module";

@Module({
  imports: [
    // Global Config (.env)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      load: [jwtConfig, databaseConfig, gatewayConfig],
    }),

    // Database (PostgreSQL via Prisma)
    PrismaModule,

    // Serve Static Files (For Uploaded Images)
    // rootPath ต้องชี้ไปที่ <backend>/public เสมอ ห้ามอิง __dirname เพราะ prisma.config.ts
    // อยู่นอก src/ ทำให้ tsc ดัน output ลงเป็น dist/src/ แทน dist/ — __dirname/../public
    // จึงกลายเป็น dist/public ที่ไม่มีอยู่จริง ทำให้รูปที่อัปโหลดทั้งหมด 404
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), "public"),
      serveRoot: "/",
      serveStaticOptions: {
        // A01/A05 — ไฟล์ในโฟลเดอร์นี้คือไฟล์ที่ "ผู้ใช้อัปโหลดเอง" แต่ถูกเสิร์ฟจาก
        // โดเมน api ของเรา ถ้า browser เผลอ render เป็น HTML/SVG ขึ้นมาเมื่อไร
        // มันคือ stored XSS บน origin ที่ถือ session ของระบบ
        setHeaders: (res, filePath) => {
          res.setHeader("X-Content-Type-Options", "nosniff");

          // ไฟล์แนบ (pdf/docx/zip) บังคับให้ดาวน์โหลดเสมอ ไม่เปิดในแท็บ
          // ส่วนรูปภาพยังต้อง inline ได้เพราะหน้าเว็บต้องแสดงผลจริง
          if (
            filePath.includes("uploads") &&
            filePath.includes("attachments")
          ) {
            res.setHeader("Content-Disposition", "attachment");
          }
        },
      },
    }),

    // ถังนับ rate limit กลาง — ใช้ทั้งกับ external developer API (ApiKeyThrottlerGuard)
    // และ endpoint กลุ่ม auth ที่ override ค่าเองด้วย @Throttle ราย route
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 300 }]),

    // เปิดใช้ @Cron(...) ทั่วแอป — ตอนนี้มีงานเดียวคือปิดกิจกรรมที่เลยเวลาอัตโนมัติ (ดู ActivitiesService)
    ScheduleModule.forRoot(),

    AuthModule,
    SeedModule,

    // Order matters from here down — see the import comment above.
    AdminModule,
    OrganizerModule,
    StudentModule,
    ActivitiesPublicModule,
    EventsPublicModule,
    VolunteerServicesPublicModule,
    ChatbotModule,
  ],
})
export class AppModule {}
