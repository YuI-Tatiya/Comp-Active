/**
 * ตรรกะ "อายุบัญชี" ของผู้จัด (ช่อง ACCOUNT_VALID หน้า /organizer/settings) — ไฟล์ล้วน ไม่ import React/DOM
 * เพื่อให้ทดสอบด้วย `npm test` (node --test) ได้ — ดู organizer-account.test.ts
 *
 * ระยะเวลาใช้งานตั้งโดยแอดมินตอนอนุมัติคำขอเป็นผู้จัด (validDays ส่งเข้า backend ตรงนั้น ไม่ได้เก็บไว้)
 * จึงประมาณ "ช่วงทั้งหมด" จาก createdAt → validUntil (บัญชีผู้จัดถูกสร้างพร้อมอนุมัติเสมอ เวลาจึงตรงกัน)
 */

const DAY_MS = 24 * 60 * 60 * 1000

function parseDate(value: string | null | undefined): Date | null {
    if (!value) return null
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
}

export type AccountValidity =
    | { kind: "unlimited" }
    | { kind: "expired" }
    | { kind: "active"; daysRemaining: number; percentElapsed: number }

/**
 * สถานะอายุบัญชี ณ เวลา now — ไม่มี validUntil = ไม่มีกำหนดหมดอายุ, เลยกำหนดแล้ว = หมดอายุแล้ว,
 * ไม่งั้นคืนจำนวนวันที่เหลือ (ปัดขึ้น) และ % ของช่วงเวลาทั้งหมดที่ผ่านไปแล้ว (สำหรับแถบความคืบหน้า)
 *
 * "expired" แทบเป็นไปไม่ได้ในทางปฏิบัติ — ทั้ง AuthService.login และ JwtStrategy ปฏิเสธผู้จัดที่
 * validUntil ผ่านไปแล้วตั้งแต่ก่อนจะมาถึงหน้านี้ (ทุกคำขอ รวมถึง getProfile ที่หน้านี้ใช้) ใส่ไว้กันพัง
 * เฉยๆ เผื่อ race condition หรือข้อมูลที่โหลดค้างไว้ ไม่ใช่สถานะที่ตั้งใจให้ผู้ใช้จริงเห็น
 */
export function accountValidity(
    createdAt: string | null | undefined,
    validUntil: string | null | undefined,
    now: Date
): AccountValidity {
    const end = parseDate(validUntil)
    if (!end) return { kind: "unlimited" }

    const diff = end.getTime() - now.getTime()
    if (diff <= 0) return { kind: "expired" }

    const daysRemaining = Math.ceil(diff / DAY_MS)

    const start = parseDate(createdAt)
    const totalSpan = start ? end.getTime() - start.getTime() : 0
    const elapsed = start ? now.getTime() - start.getTime() : 0
    // ช่วงทั้งหมด ≤ 0 (ข้อมูลเพี้ยน/ไม่มี createdAt) — ไม่มีฐานคำนวณ % ให้ถือว่าเพิ่งเริ่ม ไม่ใช่เต็มแถบ
    const percentElapsed = totalSpan <= 0 ? 0 : Math.min(100, Math.max(0, (elapsed / totalSpan) * 100))

    return { kind: "active", daysRemaining, percentElapsed }
}
