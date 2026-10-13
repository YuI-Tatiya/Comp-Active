// ไฟล์นี้ไม่ import อะไรตอนรัน เพื่อให้ทดสอบด้วย node --test ได้ — ดู registration-bucket.test.ts
// (lib/api.ts re-export isCancelledByOrganizer จากที่นี่ หน้าอื่นจึง import จาก "@/lib/api" ได้ตามเดิม)

/**
 * true ถ้าผู้จัดยกเลิกกิจกรรมนี้เอง (ApprovalStatus.CANCELLED)
 *
 * รองรับค่าเก่า "rejected" ไว้ด้วยเผื่อข้อมูลก่อนเปลี่ยน enum — backend เขียนค่าใหม่
 * เป็น "cancelled" เสมอตั้งแต่นี้ไป (แยกจาก "rejected" ที่สงวนไว้สำหรับแอดมิน/ระบบ
 * ปฏิเสธ ซึ่งยังไม่มี flow จริงในระบบตอนนี้)
 */
export function isCancelledByOrganizer(approvalStatus: string | null | undefined): boolean {
    return approvalStatus === "cancelled" || approvalStatus === "rejected"
}

/** 4 สถานะของหน้า "กิจกรรมของฉัน" — ลำดับเดียวกับการ์ดสถานะบนหน้า */
export type RegistrationBucket = "pending" | "confirmed" | "evaluated" | "cancelled"

export interface BucketableRegistration {
    status: string
    evaluation?: unknown
    activity: { approvalStatus?: string | null }
}

/**
 * จัดรายการลงทะเบียนเข้า 1 ใน 4 สถานะ — ทุกรายการลงได้กลุ่มเดียวพอดี
 *
 * - มีผลประเมิน = เช็คอินแล้ว (backend สร้าง evaluation พร้อมเช็คอินเสมอ) → ประเมินแล้ว
 *   แม้ผู้จัดจะยกเลิกกิจกรรมทีหลัง เพราะคะแนนที่ได้ไปแล้วยังนับอยู่
 * - ผู้จัดยกเลิกทั้งงาน → ยกเลิกแล้ว ถึงแถวลงทะเบียนจะยังเป็น pending/confirmed — backend ไม่แก้สถานะ
 *   แถวลงทะเบียนตอนยกเลิกกิจกรรม (activities.repository.ts cancelByOrganizer) เดิมรายการแบบนี้จึงค้างอยู่ใต้
 *   "รอยืนยัน"/"ยืนยันแล้ว" พร้อมปุ่มยกเลิก ทั้งที่คำอธิบายบนหน้าบอกว่าอยู่หมวดยกเลิก
 */
export function registrationBucket(r: BucketableRegistration): RegistrationBucket {
    if (r.evaluation) return "evaluated"
    if (r.status === "cancelled" || isCancelledByOrganizer(r.activity.approvalStatus)) return "cancelled"
    if (r.status === "confirmed") return "confirmed"
    return "pending"
}
