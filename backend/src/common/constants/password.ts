/**
 * A07 Authentication Failures — นโยบายรหัสผ่าน
 *
 * ของเดิมทั้งนักศึกษาและ "บัญชี Admin" ใช้เกณฑ์เดียวกันคือ @MinLength(6) ล้วน ๆ
 * รหัสอย่าง 123456 จึงผ่าน — เดาได้ในไม่กี่วินาทีถ้าไม่มี rate limit และ
 * บัญชี Admin คือกุญแจของทั้งระบบ จึงต้องเข้มกว่าบัญชีทั่วไป
 *
 * MAX_LENGTH มีไว้กัน DoS ฝั่ง CPU: bcrypt cost 12 กับ input ยาวมาก ๆ
 * ที่ผู้โจมตีส่งรัวได้ฟรีเป็นการเปลืองเครื่องเราเปล่า ๆ
 */
export const PASSWORD_MIN_LENGTH = 8;
export const ADMIN_PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

/** ต้องมีตัวอักษรและตัวเลขอย่างน้อยอย่างละหนึ่ง */
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

/** บัญชี Admin: ต้องมีพิมพ์เล็ก พิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ */
export const ADMIN_PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export const PASSWORD_ERRORS = {
  WEAK: `รหัสผ่านต้องยาวอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร และมีทั้งตัวอักษรและตัวเลข`,
  ADMIN_WEAK:
    `รหัสผ่าน Admin ต้องยาวอย่างน้อย ${ADMIN_PASSWORD_MIN_LENGTH} ตัวอักษร ` +
    "และประกอบด้วยตัวพิมพ์เล็ก พิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ",
  TOO_LONG: `รหัสผ่านต้องไม่เกิน ${PASSWORD_MAX_LENGTH} ตัวอักษร`,
} as const;
