import { checkinWindowIndex, generateCheckinToken, verifyCheckinToken, CHECKIN_TOKEN_WINDOW_MS } from './checkin-token.util';

const SECRET = 'a'.repeat(32);
const OTHER_SECRET = 'b'.repeat(32);
const ACTIVITY_ID = 42;
const OTHER_ACTIVITY_ID = 43;

// จุดกึ่งกลางของหน้าต่างที่ 1,000,000 (เวลาเท่าไรไม่สำคัญ แค่ต้องไม่ติดขอบหน้าต่างพอดี)
const WINDOW = 1_000_000;
const NOW = new Date(WINDOW * CHECKIN_TOKEN_WINDOW_MS + CHECKIN_TOKEN_WINDOW_MS / 2);
const NEXT_WINDOW = new Date(NOW.getTime() + CHECKIN_TOKEN_WINDOW_MS);
const TWO_WINDOWS_LATER = new Date(NOW.getTime() + CHECKIN_TOKEN_WINDOW_MS * 2);

describe('checkinWindowIndex', () => {
  it('ตัดเวลาลงเป็นหน้าต่าง 5 นาทีแบบเดียวกับที่ generate/verify ใช้ภายใน', () => {
    expect(checkinWindowIndex(NOW)).toBe(WINDOW);
    expect(checkinWindowIndex(NEXT_WINDOW)).toBe(WINDOW + 1);
  });
});

describe('generateCheckinToken', () => {
  it('ให้ token เดิมเป๊ะถ้า activityId + หน้าต่างเวลาเดียวกัน (ไม่มี state ก็คำนวณตรงกันได้)', () => {
    const a = generateCheckinToken(SECRET, ACTIVITY_ID, NOW);
    const b = generateCheckinToken(SECRET, ACTIVITY_ID, NOW);
    expect(a.token).toBe(b.token);
  });

  it('คนละกิจกรรม (activityId ต่างกัน) ต้องได้ token คนละตัว แม้เวลาเดียวกัน', () => {
    const a = generateCheckinToken(SECRET, ACTIVITY_ID, NOW);
    const b = generateCheckinToken(SECRET, OTHER_ACTIVITY_ID, NOW);
    expect(a.token).not.toBe(b.token);
  });

  it('คนละหน้าต่างเวลา ต้องได้ token คนละตัว แม้ activityId เดียวกัน', () => {
    const a = generateCheckinToken(SECRET, ACTIVITY_ID, NOW);
    const b = generateCheckinToken(SECRET, ACTIVITY_ID, NEXT_WINDOW);
    expect(a.token).not.toBe(b.token);
  });

  it('expiresAt คือจุดเริ่มของหน้าต่างถัดไปพอดี', () => {
    const { expiresAt } = generateCheckinToken(SECRET, ACTIVITY_ID, NOW);
    expect(expiresAt.getTime()).toBe((WINDOW + 1) * CHECKIN_TOKEN_WINDOW_MS);
  });
});

describe('verifyCheckinToken', () => {
  it('token ที่เพิ่งสร้างในหน้าต่างปัจจุบัน ผ่านทันที', () => {
    const { token } = generateCheckinToken(SECRET, ACTIVITY_ID, NOW);
    expect(verifyCheckinToken(SECRET, ACTIVITY_ID, token, NOW)).toBe(true);
  });

  it('token จากหน้าต่างก่อนหน้าทันที (grace 1 ช่วง) ยังผ่าน', () => {
    const { token } = generateCheckinToken(SECRET, ACTIVITY_ID, NOW);
    expect(verifyCheckinToken(SECRET, ACTIVITY_ID, token, NEXT_WINDOW)).toBe(true);
  });

  it('token เก่ากว่า 2 หน้าต่างขึ้นไป ต้องไม่ผ่าน', () => {
    const { token } = generateCheckinToken(SECRET, ACTIVITY_ID, NOW);
    expect(verifyCheckinToken(SECRET, ACTIVITY_ID, token, TWO_WINDOWS_LATER)).toBe(false);
  });

  it('token ที่ยังไม่ถึงเวลา (จากหน้าต่างอนาคต) ต้องไม่ผ่าน', () => {
    const { token } = generateCheckinToken(SECRET, ACTIVITY_ID, NEXT_WINDOW);
    expect(verifyCheckinToken(SECRET, ACTIVITY_ID, token, NOW)).toBe(false);
  });

  it('เอา token ของกิจกรรมอื่นมาสวมรอยกับกิจกรรมนี้ ต้องไม่ผ่าน', () => {
    const { token } = generateCheckinToken(SECRET, OTHER_ACTIVITY_ID, NOW);
    expect(verifyCheckinToken(SECRET, ACTIVITY_ID, token, NOW)).toBe(false);
  });

  it('secret ไม่ตรง (เช่นตั้งค่าผิดเครื่อง) ต้องไม่ผ่าน', () => {
    const { token } = generateCheckinToken(SECRET, ACTIVITY_ID, NOW);
    expect(verifyCheckinToken(OTHER_SECRET, ACTIVITY_ID, token, NOW)).toBe(false);
  });

  it('แก้ลายเซ็นแม้แค่ตัวเดียว (ปลอม token) ต้องไม่ผ่าน', () => {
    const { token } = generateCheckinToken(SECRET, ACTIVITY_ID, NOW);
    const [prefix, signature] = token.split('.');
    const tampered = `${prefix}.${signature.slice(0, -1)}${signature.at(-1) === 'a' ? 'b' : 'a'}`;
    expect(verifyCheckinToken(SECRET, ACTIVITY_ID, tampered, NOW)).toBe(false);
  });

  it('ข้อความมั่วๆ ที่ไม่ใช่ token เลย ไม่ throw แค่คืน false', () => {
    expect(verifyCheckinToken(SECRET, ACTIVITY_ID, '', NOW)).toBe(false);
    expect(verifyCheckinToken(SECRET, ACTIVITY_ID, 'not-a-real-token', NOW)).toBe(false);
    expect(verifyCheckinToken(SECRET, ACTIVITY_ID, '.', NOW)).toBe(false);
    expect(verifyCheckinToken(SECRET, ACTIVITY_ID, 'abc.not-hex-at-all-zz', NOW)).toBe(false);
    expect(verifyCheckinToken(SECRET, ACTIVITY_ID, '-5.deadbeef', NOW)).toBe(false);
  });
});
