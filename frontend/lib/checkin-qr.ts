// lib/checkin-qr.ts — ตรรกะล้วนของการแกะ URL เช็คอินจาก QR (ไม่แตะ DOM/React) ใช้ร่วมกันระหว่าง
// ตัวสแกนกล้องสด (qr-scanner-modal.tsx) และทางสำรองอัปโหลดรูป (qr-checkin-button.tsx)

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
