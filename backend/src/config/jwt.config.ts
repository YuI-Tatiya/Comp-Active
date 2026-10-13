import { registerAs } from "@nestjs/config";

/**
 * ค่าตัวอย่างที่เผยแพร่ต่อสาธารณะ (.env.example, README) — ถ้าหลุดมาถึง production
 * เท่ากับไม่มี secret เลย เพราะใครก็เปิดดูได้จาก repo
 *
 * บางตัวยาวเกิน 32 ตัวอักษรจึงผ่านเกณฑ์ความยาวไปได้ ต้องดักด้วยรายชื่อนี้อีกชั้น
 */
const PLACEHOLDER_SECRETS = new Set([
  "default-secret",
  "your-super-secret-jwt-key-change-this-in-production",
  // ตัวอย่างใน README — ยาวพอผ่านเกณฑ์ แต่เปิดเผยต่อสาธารณะ
  "paste-a-generated-value-here-at-least-32-chars",
  "secret",
  "changeme",
]);

const MIN_SECRET_LENGTH = 32;

/**
 * A02 Security Misconfiguration / A07 Authentication Failures
 *
 * ของเดิมเป็น `process.env.JWT_SECRET || 'default-secret'` ซึ่งอันตรายมาก:
 * ถ้าลืมตั้ง env (หรือ container โหลด .env ไม่ติด) ระบบจะยังบูตขึ้นตามปกติแต่เซ็น JWT
 * ด้วยคำว่า 'default-secret' ที่อยู่ในซอร์สโค้ดสาธารณะ — ใครก็ปลอม token เป็น
 * { sub: 1, role: 'admin' } แล้วยึดระบบทั้งหมดได้ทันทีโดยไม่ต้องรู้รหัสผ่านใคร
 *
 * ตอนนี้เลือก "ล้มตั้งแต่บูต" แทนการรันต่อแบบไม่ปลอดภัย (fail closed)
 */
function resolveSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "JWT_SECRET ไม่ได้ถูกตั้งค่า — ตั้งใน .env ก่อนเริ่มระบบ " +
        "(สร้างด้วย: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\")",
    );
  }

  if (PLACEHOLDER_SECRETS.has(secret)) {
    throw new Error(
      "JWT_SECRET ยังเป็นค่าตัวอย่างจาก .env.example — ต้องเปลี่ยนเป็นค่าสุ่มของจริง",
    );
  }

  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET สั้นเกินไป (${secret.length} ตัวอักษร) — ต้องยาวอย่างน้อย ${MIN_SECRET_LENGTH} ตัวอักษร`,
    );
  }

  return secret;
}

export default registerAs("jwt", () => ({
  secret: resolveSecret(),
  expiresIn: process.env.JWT_EXPIRES_IN || "7d",
}));
