import { generateTranscriptCode, normalizeTranscriptCode, formatTranscriptCode } from './skill-transcript-code.util';

const VALID = /^[0-9A-HJKMNP-TV-Z]{16}$/;

describe('generateTranscriptCode', () => {
  it('ได้ 16 ตัวอักษรจากชุดตัวอักษร Crockford เท่านั้น', () => {
    for (let i = 0; i < 200; i++) expect(generateTranscriptCode()).toMatch(VALID);
  });

  it('สุ่มไม่ซ้ำกันในหลายพันครั้ง', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i++) seen.add(generateTranscriptCode());
    expect(seen.size).toBe(5000);
  });
});

describe('normalizeTranscriptCode', () => {
  const CODE = '0123456789ABCDGG';

  it('รับรหัสที่ถูกต้องตามเดิม', () => {
    expect(normalizeTranscriptCode(CODE)).toBe(CODE);
  });

  it('ตัดขีดและช่องว่าง และแปลงเป็นตัวพิมพ์ใหญ่', () => {
    expect(normalizeTranscriptCode('0123-4567-89ab-cdgg')).toBe(CODE);
    expect(normalizeTranscriptCode('  0123 4567 89AB CDGG  ')).toBe(CODE);
  });

  it('แปลงตัวอักษรที่สับสนง่าย: O→0, I→1, L→1', () => {
    expect(normalizeTranscriptCode('O123456789ABCDGG')).toBe('0123456789ABCDGG');
    expect(normalizeTranscriptCode('I123456789ABCDGG')).toBe('1123456789ABCDGG');
    expect(normalizeTranscriptCode('l123456789ABCDGG')).toBe('1123456789ABCDGG');
  });

  it.each([
    ['ว่าง', ''],
    ['สั้นเกิน', '0123-4567'],
    ['ยาวเกิน', '0123456789ABCDGGG'],
    ['มีตัว U (ไม่อยู่ในชุดตัวอักษร)', 'U123456789ABCDGG'],
    ['อักขระพิเศษ/คล้าย SQL', "'; DROP TABLE users;--"],
    ['ภาษาไทย', 'สวัสดีสวัสดีสวัสดี'],
  ])('คืน null เมื่อ %s', (_label, input) => {
    expect(normalizeTranscriptCode(input)).toBeNull();
  });
});

describe('formatTranscriptCode', () => {
  it('จัดเป็นกลุ่มละ 4 คั่นด้วยขีด', () => {
    expect(formatTranscriptCode('0123456789ABCDGG')).toBe('0123-4567-89AB-CDGG');
  });
});
