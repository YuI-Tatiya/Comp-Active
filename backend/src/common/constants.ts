export const STUDENT_EMAIL_DOMAIN = 'kkumail.com';

export const AUTH_ERRORS = {
  STUDENT_INVALID: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  ORGANIZER_INVALID: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
  ADMIN_INVALID: 'รหัสผ่านไม่ถูกต้อง',
  ORGANIZER_EXPIRED:
    'บัญชีผู้จัดกิจกรรมของคุณหมดอายุการใช้งาน กรุณาติดต่อเจ้าหน้าที่ดูแลระบบ Comp Active เพื่อต่ออายุการใช้งาน',
  ACCOUNT_BLOCKED: 'บัญชีนี้ถูกระงับการใช้งาน',
} as const;
