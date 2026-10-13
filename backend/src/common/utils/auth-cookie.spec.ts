import type { Response } from 'express';
import {
  AUTH_COOKIE_NAME,
  clearAuthCookie,
  resolveSameSite,
  setAuthCookie,
} from './auth-cookie.util';

/** Response ปลอมที่จับ argument ที่ถูกส่งเข้า res.cookie / res.clearCookie */
function fakeRes() {
  const calls: { set: any[]; clear: any[] } = { set: [], clear: [] };
  const res = {
    cookie: (...args: any[]) => calls.set.push(args),
    clearCookie: (...args: any[]) => calls.clear.push(args),
  } as unknown as Response;
  return { res, calls };
}

describe('auth cookie — A07: session ต้องอยู่ใน httpOnly cookie', () => {
  describe('resolveSameSite', () => {
    it('ค่าเริ่มต้นคือ lax เมื่อไม่ได้ตั้ง env', () => {
      expect(resolveSameSite(undefined)).toBe('lax');
      expect(resolveSameSite('')).toBe('lax');
    });

    it('รับ none / strict และไม่สนตัวพิมพ์', () => {
      expect(resolveSameSite('none')).toBe('none');
      expect(resolveSameSite('  NONE ')).toBe('none');
      expect(resolveSameSite('Strict')).toBe('strict');
    });

    it('ค่าที่พิมพ์ผิดต้องตกกลับเป็น lax ไม่ใช่หลุดไปถึงเบราว์เซอร์', () => {
      expect(resolveSameSite('nonee')).toBe('lax');
      expect(resolveSameSite('true')).toBe('lax');
    });
  });

  describe('setAuthCookie', () => {
    it('ตั้ง httpOnly เสมอ — นี่คือหัวใจของการกัน XSS ขโมย session', () => {
      const { res, calls } = fakeRes();
      setAuthCookie(res, 'jwt-token', { expiresIn: '7d', isProduction: false, sameSite: 'lax' });

      const [name, value, options] = calls.set[0];
      expect(name).toBe(AUTH_COOKIE_NAME);
      expect(value).toBe('jwt-token');
      expect(options.httpOnly).toBe(true);
    });

    it('dev (http) ไม่ตั้ง Secure ไม่งั้นเบราว์เซอร์ทิ้ง cookie เงียบ ๆ', () => {
      const { res, calls } = fakeRes();
      setAuthCookie(res, 't', { expiresIn: '7d', isProduction: false, sameSite: 'lax' });
      expect(calls.set[0][2].secure).toBe(false);
    });

    it('production ต้องตั้ง Secure', () => {
      const { res, calls } = fakeRes();
      setAuthCookie(res, 't', { expiresIn: '7d', isProduction: true, sameSite: 'lax' });
      expect(calls.set[0][2].secure).toBe(true);
    });

    it('SameSite=None ต้องบังคับ Secure แม้อยู่ใน dev — ไม่งั้น cookie ถูกทิ้งทันที', () => {
      const { res, calls } = fakeRes();
      setAuthCookie(res, 't', { expiresIn: '7d', isProduction: false, sameSite: 'none' });

      const options = calls.set[0][2];
      expect(options.sameSite).toBe('none');
      expect(options.secure).toBe(true);
    });

    it('แปลง JWT_EXPIRES_IN เป็น maxAge ได้ถูกหน่วย', () => {
      const cases: [string, number][] = [
        ['7d', 7 * 86_400_000],
        ['24h', 24 * 3_600_000],
        ['30m', 30 * 60_000],
        ['45s', 45_000],
      ];

      for (const [expiresIn, expected] of cases) {
        const { res, calls } = fakeRes();
        setAuthCookie(res, 't', { expiresIn, isProduction: true, sameSite: 'lax' });
        expect(calls.set[0][2].maxAge).toBe(expected);
      }
    });

    it('ค่า expiresIn ที่อ่านไม่ออก ตกกลับเป็น 7 วัน ไม่ใช่ NaN', () => {
      const { res, calls } = fakeRes();
      setAuthCookie(res, 't', { expiresIn: 'ไม่รู้เรื่อง', isProduction: true, sameSite: 'lax' });
      expect(calls.set[0][2].maxAge).toBe(7 * 86_400_000);
    });
  });

  describe('clearAuthCookie', () => {
    it('ใช้ option ชุดเดียวกับตอน set ไม่งั้นเบราว์เซอร์ลบไม่ตรงตัว', () => {
      const { res, calls } = fakeRes();
      clearAuthCookie(res, { isProduction: true, sameSite: 'none' });

      const [name, options] = calls.clear[0];
      expect(name).toBe(AUTH_COOKIE_NAME);
      expect(options.httpOnly).toBe(true);
      expect(options.secure).toBe(true);
      expect(options.sameSite).toBe('none');
      expect(options.path).toBe('/');
    });
  });
});
