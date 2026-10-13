// นำเข้า type ClassValue และฟังก์ชัน clsx จาก library "clsx"
// - clsx ใช้สำหรับรวม className หลาย ๆ ค่าเข้าด้วยกัน
// - ClassValue เป็น type ที่บอกว่าค่าที่ส่งเข้า clsx เป็นรูปแบบใดได้บ้าง
//   เช่น string, array, object, boolean เป็นต้น
import { type ClassValue, clsx } from "clsx";

// นำเข้า twMerge จาก library "tailwind-merge"
// - twMerge ใช้สำหรับจัดการ class ของ Tailwind CSS
// - ถ้ามี class ที่ซ้ำหรือขัดแย้งกัน (เช่น p-2 กับ p-4)
//   จะเลือกเฉพาะ class ที่ถูกต้องตัวสุดท้าย
import { twMerge } from "tailwind-merge";

// สร้างฟังก์ชันชื่อ cn (ย่อมาจาก className)
// - ใช้ export เพื่อให้ไฟล์อื่นสามารถ import ไปใช้ได้
export function cn(
  // ...inputs คือ rest parameter
  // - รับ argument ได้หลายค่า ไม่จำกัดจำนวน
  // - แต่ละค่าต้องเป็นชนิด ClassValue
  ...inputs: ClassValue[]
) {
  // ขั้นตอนการทำงาน:
  // 1. clsx(inputs)
  //    - รวม className ทั้งหมดเข้าด้วยกัน
  //    - รองรับเงื่อนไข เช่น true / false
  //
  // 2. twMerge(...)
  //    - ตรวจสอบ class ของ Tailwind
  //    - ลบ class ที่ซ้ำหรือขัดแย้งกัน
  //    - เหลือเฉพาะ class ที่ควรใช้จริง
  return twMerge(clsx(inputs));
}

/** สลับค่าเข้า/ออกจาก array — ใช้กับ checkbox กลุ่มแบบเลือกได้หลายค่า (เช่น หมวดหมู่) */
export function toggleInArray<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
