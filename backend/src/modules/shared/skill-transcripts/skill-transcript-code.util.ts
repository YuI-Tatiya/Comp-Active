import { randomBytes } from 'crypto';

/** Crockford base32 — ตัด I L O U ออกเพื่อไม่ให้สับสนกับ 1 0 และกันคำหยาบ */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const VALID_CODE = /^[0-9A-HJKMNP-TV-Z]{16}$/;

/**
 * รหัสเอกสาร 80 บิต (10 ไบต์ -> 16 ตัวอักษร ตัวละ 5 บิต) — ต้องเดาไม่ได้เพราะรู้รหัส = เปิดดูข้อมูลได้
 * จึงใช้ crypto.randomBytes ตามกฎของโปรเจกต์ ไม่ใช้ Math.random()
 */
export function generateTranscriptCode(): string {
  const bytes = randomBytes(10);
  let value = 0;
  let bits = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    value &= (1 << bits) - 1;
  }
  return out;
}

/** รับรหัสที่ผู้ใช้พิมพ์/วางมา — คืนรูปแบบมาตรฐาน (ไม่มีขีด พิมพ์ใหญ่) หรือ null ถ้าไม่ใช่รหัสที่ถูกต้อง */
export function normalizeTranscriptCode(input: string): string | null {
  const cleaned = input
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  return VALID_CODE.test(cleaned) ? cleaned : null;
}

/** XXXX-XXXX-XXXX-XXXX สำหรับแสดงผล */
export function formatTranscriptCode(code: string): string {
  return code.match(/.{1,4}/g)?.join('-') ?? code;
}
