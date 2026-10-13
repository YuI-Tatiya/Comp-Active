import { createHmac, timingSafeEqual } from 'crypto';

/**
 * โทเค็นหมุนรหัสสำหรับ QR เช็คอินด้วยตัวเอง — กันแคปภาพ/ส่งต่อลิงก์ให้เพื่อนที่ไม่ได้มาหน้างาน
 * ไม่มี state ในฐานข้อมูลเลย: ทั้งฝั่งสร้าง (ให้ผู้จัดดู) และฝั่งตรวจ (ตอนนักศึกษาสแกน) คำนวณจาก
 * "activityId + หน้าต่างเวลาปัจจุบัน (floor(now / 5 นาที))" อิสระจากกัน ได้ค่าตรงกันเองโดยไม่ต้องจำอะไรไว้
 *
 * ยอมรับหน้าต่างปัจจุบันหรือหน้าต่างก่อนหน้าทันที (grace 1 ช่วง) กันกรณีสแกนตอนใกล้รอยต่อพอดีแล้ว
 * request มาถึง server ช้ากว่าที่ตั้งใจเล็กน้อย (ให้ validity จริงใกล้เคียง 5-10 นาที ไม่ใช่ 5 นาทีเป๊ะ)
 */
export const CHECKIN_TOKEN_WINDOW_MS = 5 * 60 * 1000;

/** ตัดหน่วยเวลาลงเป็นดัชนีหน้าต่าง 5 นาที — ใช้ร่วมกันทั้งฝั่งสร้างและฝั่งตรวจ */
export function checkinWindowIndex(at: Date): number {
  return Math.floor(at.getTime() / CHECKIN_TOKEN_WINDOW_MS);
}

function signWindow(secret: string, activityId: number, windowIndex: number): string {
  // คำนำหน้า "checkin:" กัน token ชุดนี้ชนกับการใช้ secret เดียวกันไปเซ็นอย่างอื่น (เช่น JWT)
  return createHmac('sha256', secret).update(`checkin:${activityId}:${windowIndex}`).digest('hex');
}

export interface CheckinToken {
  /** ค่าที่เอาไปฝังใน query string ของ URL เช็คอิน (?token=...) */
  token: string;
  /** เวลาที่ token ชุดนี้จะกลายเป็นหน้าต่างเก่า (ให้ฝั่งแสดงผล QR รู้ว่าจะต้องขอใหม่ตอนไหน) */
  expiresAt: Date;
}

/** สร้าง token สำหรับหน้าต่างเวลาปัจจุบัน (เรียกตอนผู้จัดเปิดดู/รีเฟรช QR) */
export function generateCheckinToken(secret: string, activityId: number, now = new Date()): CheckinToken {
  const windowIndex = checkinWindowIndex(now);
  const signature = signWindow(secret, activityId, windowIndex);
  return {
    token: `${windowIndex.toString(36)}.${signature}`,
    expiresAt: new Date((windowIndex + 1) * CHECKIN_TOKEN_WINDOW_MS),
  };
}

/** ตรวจ token ที่นักศึกษาส่งมาตอนสแกน — true เฉพาะหน้าต่างปัจจุบันหรือหน้าต่างก่อนหน้าทันที และลงชื่อถูกต้องจริง */
export function verifyCheckinToken(secret: string, activityId: number, token: string, now = new Date()): boolean {
  const dotIndex = token.indexOf('.');
  if (dotIndex <= 0) return false;

  const windowIndex = parseInt(token.slice(0, dotIndex), 36);
  const signature = token.slice(dotIndex + 1);
  if (!Number.isInteger(windowIndex) || windowIndex < 0) return false;

  const currentWindow = checkinWindowIndex(now);
  if (windowIndex !== currentWindow && windowIndex !== currentWindow - 1) return false;

  const expected = signWindow(secret, activityId, windowIndex);
  const expectedBuf = Buffer.from(expected, 'hex');
  const signatureBuf = Buffer.from(signature, 'hex');
  // ความยาวไม่ตรงไม่ใช่การรั่วไหลของ secret (แค่รูปแบบ hex ผิด) — เช็คก่อนเพื่อกัน timingSafeEqual throw
  if (expectedBuf.length !== signatureBuf.length) return false;

  return timingSafeEqual(expectedBuf, signatureBuf);
}
