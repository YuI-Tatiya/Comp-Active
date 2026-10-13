import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { createHash } from "crypto";

/**
 * A07 Authentication Failures — กัน brute force / password spraying ที่หน้า login
 *
 * ของเดิมไม่มี rate limit ที่ /api/auth/login เลย เครื่องมืออย่าง Burp Intruder หรือ
 * Hydra จึงยิงรหัสผ่านได้ไม่จำกัดจำนวนครั้ง
 *
 * ทำไมนับตาม "บัญชี" ไม่ใช่ตาม IP:
 * นักศึกษาทั้งวิทยาลัยออกเน็ตผ่าน NAT ของมหาลัย = IP สาธารณะเดียวกันเกือบทั้งหมด
 * ถ้านับตาม IP คนที่ล็อกอินถูกต้องจะโดนบล็อกไปด้วยเพราะเพื่อนใช้โควตาหมด
 * และผู้โจมตีที่มี botnet ก็แค่เปลี่ยน IP หนีได้อยู่ดี การนับตามบัญชีเป้าหมาย
 * จึงกันการเดารหัสผ่านของบัญชีหนึ่ง ๆ ได้ตรงจุดกว่า โดยไม่ลงโทษผู้ใช้ที่สุจริต
 *
 * hash ตัว identifier ก่อนใช้เป็น key เพราะ key ถูกเก็บใน storage ของ throttler
 * ไม่ควรมีอีเมลจริงไปนอนอยู่ในนั้น (A09: อย่าให้ระบบ logging/monitoring กลายเป็น
 * แหล่งข้อมูลส่วนบุคคลเสียเอง)
 */
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const identifier: unknown = req.body?.identifier ?? req.body?.email;

    if (typeof identifier === "string" && identifier.trim()) {
      const normalized = identifier.trim().toLowerCase();
      return `auth-id-${createHash("sha256").update(normalized).digest("hex").slice(0, 32)}`;
    }

    return `auth-ip-${req.ip}`;
  }
}
