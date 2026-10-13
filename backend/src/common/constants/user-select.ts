/**
 * Allow-list ของ field ใน User ที่ปล่อยออกไปได้เมื่อ join ผ่านความสัมพันธ์ (registration.student ฯลฯ)
 *
 * ห้ามเขียน `student: true` / `include: { student: true }` — Prisma จะส่งแถว User ทั้งแถวออกไปใน response
 * รวม password hash และ OTP ยืนยันอีเมล (TransformInterceptor ไม่กรองอะไรให้)
 * ใช้ allow-list (select) ไม่ใช่ deny-list (omit) เพื่อให้คอลัมน์ที่เพิ่มในอนาคตไม่รั่วโดยปริยาย
 * มีเทสต์ user-select.spec.ts คอยจับถ้ามีคนกลับไปใช้ `student: true`
 */

/** ระบุตัวตนอย่างเดียว — ใช้กับเกียรติบัตร/ผลประเมินที่ไม่ต้องการข้อมูลติดต่อ */
export const STUDENT_BASIC_SELECT = { id: true, name: true, studentId: true } as const;

/** ระบุตัวตน + ช่องทางติดต่อ — ใช้กับรายชื่อผู้เข้าร่วมของผู้จัด และการส่งอีเมลถึงนักศึกษา */
export const STUDENT_CONTACT_SELECT = { ...STUDENT_BASIC_SELECT, email: true, phone: true } as const;
