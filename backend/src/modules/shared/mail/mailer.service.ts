import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport, type Transporter } from "nodemailer";
import { sanitizeHeaderValue } from "../../../common/utils";

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * ห่อ nodemailer ไว้บาง ๆ แทน @nestjs-modules/mailer ที่ถูกถอดออกไป
 *
 * เหตุผลด้านความปลอดภัย (OWASP A03 Software Supply Chain Failures):
 * @nestjs-modules/mailer ลาก template engine ทั้งชุด (mjml, liquidjs, handlebars,
 * preview-email, html-minifier) เข้ามาเป็น dependency ทั้งที่โปรเจกต์นี้ส่งอีเมลด้วย
 * HTML string ตรง ๆ ไม่เคยใช้ template engine เลย — เท่ากับแบก attack surface
 * ~45 แพ็กเกจ (มี critical 2 ตัว: handlebars RCE-class + liquidjs arbitrary file read)
 * ไว้เปล่า ๆ การเรียก nodemailer เองตัดทั้งชุดนั้นทิ้งได้
 */
@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name);
  private transporter: Transporter;
  private defaultFrom: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>("SMTP_HOST");
    const port = parseInt(this.config.get<string>("SMTP_PORT") ?? "587", 10);
    const secure = this.config.get<string>("SMTP_SECURE") === "true";

    // A04 Cryptographic Failures: ของเดิมตั้ง rejectUnauthorized:false ไว้ตายตัว
    // = ไม่ตรวจใบรับรอง TLS ของ SMTP server เลย ใครนั่งกลางทาง (Wi-Fi มหาลัย/ร้านกาแฟ)
    // ยกใบรับรองปลอมมาให้ก็เชื่อ แล้วอ่านได้ทั้งรหัสผ่าน SMTP, รหัส OTP,
    // และรหัสผ่าน Organizer ที่ระบบสุ่มส่งไปทางอีเมล
    // ตอนนี้ตรวจเสมอ ยกเว้นตั้ง SMTP_ALLOW_SELF_SIGNED=true เองตอน dev
    const allowSelfSigned =
      this.config.get<string>("SMTP_ALLOW_SELF_SIGNED") === "true";
    if (allowSelfSigned) {
      this.logger.warn(
        "SMTP_ALLOW_SELF_SIGNED=true — ปิดการตรวจใบรับรอง TLS ห้ามใช้ค่านี้ใน production",
      );
    }

    this.defaultFrom = `"Comp Active" <${this.config.get<string>("SMTP_FROM") || "no-reply@compactive.com"}>`;

    this.transporter = createTransport({
      host,
      port,
      secure,
      auth: {
        user: this.config.get<string>("SMTP_USER"),
        pass: this.config.get<string>("SMTP_PASS"),
      },
      requireTLS: !secure,
      tls: { rejectUnauthorized: !allowSelfSigned, minVersion: "TLSv1.2" },
    });
  }

  async sendMail({ to, subject, html }: SendMailOptions) {
    return this.transporter.sendMail({
      from: this.defaultFrom,
      // ตัด CR/LF กัน header injection ก่อนถึง nodemailer เสมอ
      to: sanitizeHeaderValue(to),
      subject: sanitizeHeaderValue(subject),
      html,
    });
  }
}
