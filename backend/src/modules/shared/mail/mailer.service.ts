import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { sanitizeHeaderValue } from "../../../common/utils";

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

const RESEND_API_URL = "https://api.resend.com/emails";

// fetch() ไม่มี timeout ในตัว — endpoint สมัครสมาชิก/OTP ไม่มี try/catch ครอบการส่งอีเมลไว้โดยตั้งใจ
// (ดู auth.service.ts) ถ้าไม่ตั้ง timeout เอง การเชื่อมต่อค้างจะแขวนทั้งคำขอ HTTP ไม่รู้จบ
const FETCH_TIMEOUT_MS = 15_000;

/**
 * ส่งอีเมลผ่าน Resend (HTTPS API) แทน SMTP ดิบ
 *
 * ของเดิมใช้ nodemailer ต่อ smtp.gmail.com:587 ตรง ๆ — ใช้ได้ปกติตอน dev แต่พอ deploy ขึ้น PaaS
 * (ยืนยันแล้วจริงบน Railway) พอร์ต SMTP ขาออกมักถูกบล็อกโดยดีฟอลต์เพื่อกันเซิร์ฟเวอร์ถูกใช้ส่งสแปม —
 * การเชื่อมต่อเลยค้างจน timeout แทนที่จะถูกปฏิเสธทันที (เจอจริง: POST /api/auth/register
 * ค้างแล้ว 500 "Connection timeout") Resend คุยผ่าน HTTPS พอร์ต 443 ธรรมดา จึงไม่โดนบล็อกแบบเดียวกัน
 *
 * ขอ API key ได้ที่ resend.com/api-keys — ต้อง verify โดเมนที่ใช้เป็น MAIL_FROM กับ Resend ก่อน
 * ถึงจะส่งถึงผู้รับทั่วไปได้จริง (ไม่ใช่แค่ sandbox ที่ส่งได้เฉพาะอีเมลเจ้าของบัญชีเอง)
 *
 * Interface สาธารณะ (sendMail({to, subject, html})) เหมือนเดิมทุกตัวอักษร — MailService และทุกจุดที่
 * เรียกใช้ไม่ต้องแก้อะไรเลย เปลี่ยนแค่ข้างในว่า "ส่งยังไง"
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(private readonly config: ConfigService) {}

  async sendMail({ to, subject, html }: SendMailOptions): Promise<void> {
    const apiKey = this.config.get<string>("RESEND_API_KEY")?.trim();
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY ไม่ได้ถูกตั้งค่า — ขอ API key ได้ที่ https://resend.com/api-keys",
      );
    }
    const from =
      this.config.get<string>("MAIL_FROM")?.trim() ||
      "Comp Active <no-reply@compactive.com>";

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from,
          // ตัด CR/LF ไว้อีกชั้น — ความเสี่ยง header injection เดิมเป็นคลาสของ SMTP ดิบโดยเฉพาะ
          // (ที่นี่ส่งเป็น JSON field ไม่ใช่ raw header) แต่ไม่มีเหตุผลให้ตัดการป้องกันนี้ทิ้ง
          to: sanitizeHeaderValue(to),
          subject: sanitizeHeaderValue(subject),
          html,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      const isTimeout = (err as Error).name === "AbortError";
      const reason = isTimeout
        ? `หมดเวลา ${FETCH_TIMEOUT_MS / 1000}s`
        : (err as Error).message;
      this.logger.error(`ส่งอีเมลไป ${to} ไม่สำเร็จ: ${reason}`);
      throw new Error(`ส่งอีเมลไม่สำเร็จ: ${reason}`);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      this.logger.error(
        `Resend ตอบสถานะ ${res.status} ตอนส่งอีเมลไป ${to}: ${body.slice(0, 500)}`,
      );
      throw new Error(`ส่งอีเมลไม่สำเร็จ (HTTP ${res.status})`);
    }
  }
}
