// lib/checkin-qr.ts — ตรรกะล้วนของการแกะ URL เช็คอินจาก QR (ไม่แตะ DOM/React) ใช้ใน qr-scanner-modal.tsx
// ทั้งกล้องสดและทางสำรองเลือกรูป — ตัวสแกนเปิดได้ 2 ทาง: ปุ่มบนการ์ดกิจกรรม (qr-checkin-button.tsx) และปุ่มสแกนด่วน
// กลางแถบเมนูล่าง (quick-scan-button.tsx)

export interface ParsedCheckinUrl {
    /** publicId ของกิจกรรม */
    id: string
    /** querystring เต็ม รวม "?" นำหน้า (มี token อยู่ข้างใน) — ว่างได้ถ้า QR ไม่มี token ติดมา */
    search: string
}

/**
 * QR ของผู้จัดเข้ารหัสเป็น URL รูปแบบ /student/checkin/:publicId?token=... (ดู activity-checkin-qr.tsx)
 * publicId เป็นสตริงสุ่มยาวๆ — จับทุกตัวอักษรก่อน / หรือ ? ถัดไป แทนที่จะล็อกรูปแบบ UUID ตรงๆ
 * กันพังถ้ารูปแบบ id เปลี่ยนในอนาคต
 *
 * คืน querystring (รวม token) แยกออกมาด้วยเสมอ — บั๊กเดิม (มีมาก่อนเปลี่ยนมาใช้ publicId): เคยตัดเอาแค่ id
 * แล้ว navigate ไปด้วย path เปล่าๆ ทำ token หายไปเฉยๆ หน้าเช็คอินเลยเจอ "ลิงก์ไม่สมบูรณ์" ทุกครั้ง
 */
export function parseCheckinUrl(text: string): ParsedCheckinUrl | null {
    const match = text.match(/\/student\/checkin\/([^/?]+)(\?[^\s]*)?/)
    return match ? { id: match[1], search: match[2] ?? "" } : null
}

export type CheckinScanVerdict =
    | { ok: true; href: string }
    /** not-checkin = ไม่ใช่ลิงก์เช็คอินของระบบ · other-activity = QR ของกิจกรรมอื่น · no-token = ลิงก์เช็คอินแต่ไม่มีรหัสยืนยัน */
    | { ok: false; reason: "not-checkin" | "other-activity" | "no-token" }

/**
 * ตัดสินผลสแกนหนึ่งครั้ง — ใช้ร่วมกันทั้งกล้องสดและทางสำรองเลือกรูป
 * expectedId = publicId ของกิจกรรมที่เปิดตัวสแกนจากการ์ดของมันเอง (QR ต้องเป็นของกิจกรรมนั้น)
 * ไม่ส่ง = ปุ่มสแกนด่วนบนแถบเมนูล่าง ยังไม่รู้ว่าจะเช็คอินกิจกรรมไหน รับ QR เช็คอินของกิจกรรมใดก็ได้
 * แล้วให้หน้าเช็คอินตรวจสิทธิ์ต่อเอง (ลงทะเบียน/ยืนยันแล้วหรือยัง, token หมดอายุ — ฝั่ง backend)
 * href เป็น path ภายในเว็บเสมอ (ไม่ใช่ URL ทั้งก้อนจาก QR) — QR ปลอมพาออกไปเว็บอื่นไม่ได้
 */
export function checkinScanVerdict(text: string, expectedId?: string): CheckinScanVerdict {
    const parsed = parseCheckinUrl(text)
    if (!parsed) return { ok: false, reason: "not-checkin" }
    if (expectedId !== undefined && parsed.id !== expectedId) return { ok: false, reason: "other-activity" }
    if (!new URLSearchParams(parsed.search).get("token")) return { ok: false, reason: "no-token" }
    return { ok: true, href: `/student/checkin/${parsed.id}${parsed.search}` }
}
