import 'reflect-metadata';
import { SkillTranscriptsPublicController } from './skill-transcripts-public.controller';

describe('SkillTranscriptsPublicController.verify throttle', () => {
  it('รองรับนักศึกษาทั้งวิทยาลัยที่ใช้ IP (NAT) เดียวกันกดเปิด/พิมพ์เอกสารพร้อมกัน — เพดานต้องไม่ต่ำกว่า 100 ครั้ง/นาที/IP', () => {
    // หน้าพิมพ์ของนักศึกษาเรียก verify endpoint นี้ ถ้าเพดานต่ำ นักศึกษาในแล็บเดียวกันจะโดน 429 พร้อมกัน
    const limit = Reflect.getMetadata('THROTTLER:LIMITdefault', SkillTranscriptsPublicController.prototype.verify);
    const ttl = Reflect.getMetadata('THROTTLER:TTLdefault', SkillTranscriptsPublicController.prototype.verify);

    expect(ttl).toBe(60_000);
    expect(limit).toBeGreaterThanOrEqual(100);
  });
});
