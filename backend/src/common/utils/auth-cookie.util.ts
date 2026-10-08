import type { Response } from 'express';

/**
 * A07 Authentication Failures — เก็บ JWT ใน httpOnly cookie แทน localStorage
 *
 * ของเดิม frontend เก็บ token ไว้ใน localStorage ซึ่ง JavaScript อ่านได้ทั้งหมด
 * แปลว่า XSS แค่จุดเดียวในทั้งเว็บ = ขโมย token ของทุกคนที่โดน แล้วสวมสิทธิ์ได้ยาว
 * 7 วันตาม JWT_EXPIRES_IN โดยที่เจ้าตัวไม่รู้เลย
 *
 * httpOnly cookie แก้ตรงจุดนี้: browser แนบ cookie ให้เองทุกคำขอ แต่ JavaScript
 * ในหน้าเว็บอ่านค่าไม่ได้ ต่อให้มี XSS ก็ดึง token ออกไปใช้นอกเบราว์เซอร์ไม่ได้
 *
 * ทำไมไม่ตั้ง Domain:
 * หน้าเว็บเรียก API ผ่านโฮสต์ของตัวเอง (app.localhost/api, admin.localhost/api → nginx → backend)
 * cookie จึงถูกตั้งและส่งกลับที่โฮสต์ของพอร์ทัลนั้นเท่านั้น — เป็น host-only + first-party
 * พอร์ทัลแอดมินกับพอร์ทัลนักศึกษา/ผู้จัดได้ cookie แยกกันโดยอัตโนมัติ
 *
 * เรื่อง SameSite (สำคัญ — อ่านก่อนแก้):
 * ใช้ Lax (ค่า default) — ส่ง cookie ให้คำขอจากหน้าเว็บของเราเองตามปกติ
 * และปิดช่อง CSRF ไปในตัว (เว็บของผู้โจมตีสั่ง POST มาแล้ว cookie ไม่ถูกแนบ)
 *
 * อย่ากลับไปให้หน้าเว็บยิงข้ามไป api.localhost: "localhost" เป็น TLD ในตัวมันเอง
 * app.localhost กับ api.localhost จึงเป็นคนละ site และ cookie กลายเป็น third-party —
 * Brave/Safari บล็อกหรือแยกเก็บ และ cookie เก่าค้างจนล็อกอินบัญชีใหม่แล้วยังได้บัญชีเดิม
 * (ดู frontend/lib/api-base.ts) ค่า none มีไว้เฉพาะกรณีจำเป็นต้องเรียกข้าม site จริง ๆ เท่านั้น
 */
export const AUTH_COOKIE_NAME = 'access_token';

function maxAgeMs(expiresIn: string): number {
  const match = /^(\d+)([smhd])$/.exec(expiresIn.trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000; // ค่าเริ่มต้น 7 วัน

  const value = Number(match[1]);
  const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]]!;
  return value * unit;
}

export type SameSiteMode = 'lax' | 'strict' | 'none';

/** อ่านค่าจาก env และกันค่าที่พิมพ์ผิดไม่ให้หลุดไปถึงเบราว์เซอร์ */
export function resolveSameSite(raw: string | undefined): SameSiteMode {
  const value = (raw ?? 'lax').trim().toLowerCase();
  return value === 'none' || value === 'strict' ? value : 'lax';
}

export interface AuthCookieOptions {
  expiresIn: string;
  isProduction: boolean;
  sameSite: SameSiteMode;
}

/**
 * SameSite=None บังคับให้ต้องมี Secure เสมอ ไม่งั้นเบราว์เซอร์ทิ้ง cookie ทันที
 * จึงเปิด Secure ให้อัตโนมัติ ไม่ปล่อยให้ตั้งค่าผิดจนล็อกอินไม่ได้แล้วหาสาเหตุไม่เจอ
 */
function cookieBase(opts: { isProduction: boolean; sameSite: SameSiteMode }) {
  return {
    httpOnly: true,
    sameSite: opts.sameSite,
    secure: opts.isProduction || opts.sameSite === 'none',
    path: '/',
  } as const;
}

export function setAuthCookie(res: Response, token: string, opts: AuthCookieOptions) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...cookieBase(opts),
    maxAge: maxAgeMs(opts.expiresIn),
  });
}

export function clearAuthCookie(res: Response, opts: { isProduction: boolean; sameSite: SameSiteMode }) {
  // ต้องใช้ option ชุดเดียวกับตอน set ไม่งั้นเบราว์เซอร์จะไม่ถือว่าเป็น cookie ตัวเดียวกัน
  res.clearCookie(AUTH_COOKIE_NAME, cookieBase(opts));
}
