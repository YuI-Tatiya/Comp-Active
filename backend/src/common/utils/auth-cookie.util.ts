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
 * cookie ถูกตั้งโดย api.localhost และถูกส่งกลับไปที่ api.localhost เท่านั้น
 * frontend ไม่เคยต้องอ่านมัน (อ่านไม่ได้อยู่แล้ว) จึงเป็น host-only cookie ได้
 * ไม่ต้องยุ่งกับการแชร์ cookie ข้าม subdomain ซึ่งพฤติกรรมต่างกันในแต่ละ browser
 *
 * เรื่อง SameSite (สำคัญ — อ่านก่อนแก้):
 * บน production จริง app.compactive.com กับ api.compactive.com มี registrable domain
 * เดียวกันคือ compactive.com จึงนับเป็น same-site — SameSite=Lax ส่ง cookie ให้ตามปกติ
 * และปิดช่อง CSRF ไปในตัว (เว็บของผู้โจมตีสั่ง POST มาแล้ว cookie ไม่ถูกแนบ)
 *
 * แต่ตอน dev ที่ใช้ *.localhost นั้นต่างออกไป: "localhost" เป็น TLD ในตัวมันเอง
 * ทำให้ app.localhost กับ api.localhost อาจถูกเบราว์เซอร์นับเป็นคนละ site
 * แล้ว Lax จะบล็อก cookie ใน XHR — อาการคือ "ล็อกอินผ่านแต่เด้งกลับหน้า login ทันที"
 * ถ้าเจออาการนี้ ให้ตั้ง AUTH_COOKIE_SAMESITE=none ใน .env ของ backend
 * (Chrome ยอมให้ cookie ที่มี Secure ทำงานบน http://*.localhost เพราะถือเป็น loopback)
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
