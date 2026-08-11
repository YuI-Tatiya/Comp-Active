export * from "./programs";

export const STUDENT_EMAIL_DOMAIN = "kkumail.com";

export const AUTH_ERRORS = {
  STUDENT_INVALID: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  ORGANIZER_INVALID: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
  ADMIN_INVALID: "รหัสผ่านไม่ถูกต้อง",
  ORGANIZER_EXPIRED:
    "บัญชีผู้จัดกิจกรรมของคุณหมดอายุการใช้งาน กรุณาติดต่อเจ้าหน้าที่ดูแลระบบ Comp Active เพื่อต่ออายุการใช้งาน",
  ACCOUNT_BLOCKED: "บัญชีนี้ถูกระงับการใช้งาน",
} as const;

export const ACADEMIC_ERRORS = {
  LEVEL_REQUIRED: "กรุณาเลือกระดับการศึกษา",
  PROGRAM_MISMATCH: "สาขาวิชาไม่ตรงกับระดับการศึกษาที่เลือก",
  YEAR_INVALID: "ชั้นปีไม่ถูกต้องสำหรับระดับการศึกษาที่เลือก",
  PHONE_INVALID: "เบอร์มือถือไม่ถูกต้อง",
  STUDENT_ID_INVALID: "รหัสนักศึกษาไม่ถูกต้อง",
} as const;

/** เบอร์มือถือไทย 10 หลัก ขึ้นต้น 06 / 08 / 09 */
export const THAI_MOBILE_REGEX = /^0[689]\d{8}$/;

/**
 * รหัสนักศึกษาวิทยาลัยการคอมพิวเตอร์ — รูปแบบ 653380123-4
 *   ตำแหน่ง 1-2  = ปีที่เข้าศึกษา
 *   ตำแหน่ง 3-6  = 3380 (รหัสคณะ) ← บังคับ
 *   ตำแหน่ง 7-9  = เลขลำดับ
 *   หลัง "-"     = เลขตรวจสอบ 1 หลัก (ขีดจะใส่หรือไม่ใส่ก็ได้)
 */
export const STUDENT_ID_FACULTY_CODE = "3380";
export const STUDENT_ID_REGEX = /^\d{2}3380\d{3}-?\d$/;
