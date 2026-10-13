// ตรวจชนิดอุปกรณ์ฝั่ง browser — แยกเป็นฟังก์ชันล้วนเพื่อทดสอบด้วย node --test ได้

export interface DeviceSignals {
    userAgent: string
    /** navigator.maxTouchPoints — ใช้แยก iPad ที่ปลอมตัวเป็น Mac */
    maxTouchPoints: number
}

export const SCAN_MOBILE_ONLY_MESSAGE =
    "การสแกน QR เพื่อเช็คอินใช้ได้เฉพาะบนโทรศัพท์มือถือหรือ iPad เท่านั้น กรุณาเปิดหน้านี้ด้วยอุปกรณ์ดังกล่าว"

/**
 * true = โทรศัพท์มือถือหรือแท็บเล็ต (iPhone, iPad, Android) — false = notebook / MacBook / คอมพิวเตอร์ตั้งโต๊ะ
 *
 * iPadOS 13+ ส่ง User-Agent เป็น "Macintosh" เหมือน MacBook (โหมดเว็บเดสก์ท็อป) จึงแยกด้วยจอสัมผัส:
 * Mac จริงไม่มีจอสัมผัส (maxTouchPoints = 0) ส่วน iPad มี 5
 *
 * หมายเหตุ: นี่คือการกันที่หน้าเว็บ ใช้ User-Agent ซึ่งผู้ใช้ตั้งปลอมได้ (เช่น โหมดจำลองมือถือใน DevTools)
 * ตั้งใจให้เป็นข้อจำกัดด้านการใช้งาน ไม่ใช่การรักษาความปลอดภัย
 */
export function isScanCapableDevice({ userAgent, maxTouchPoints }: DeviceSignals): boolean {
    if (/iPhone|iPod|iPad|Android/i.test(userAgent)) return true
    if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return true
    return false
}
