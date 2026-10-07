// ที่อยู่ของ backend ที่หน้าเว็บใช้ — แยกออกมาจาก lib/api.ts เพื่อให้ทดสอบด้วย node --test ได้

/**
 * ค่าพิเศษของ NEXT_PUBLIC_API_URL: ให้หน้าเว็บเรียก API ผ่านโดเมนของตัวเอง
 * (app.localhost/api/... → nginx → backend) แทนการยิงข้ามไป api.localhost
 *
 * ทำไม: cookie ของ session เป็น httpOnly ที่ backend ตั้ง ถ้า API อยู่คนละ site กับหน้าเว็บ
 * (app.localhost กับ api.localhost นับเป็นคนละ site) cookie จะกลายเป็น third-party —
 * Brave/Safari บล็อกหรือแยกเก็บ และ cookie เก่าค้างจนล็อกอินบัญชีใหม่แล้วยังได้ role เดิม
 * เรียกผ่านโดเมนเดียวกัน cookie เป็น first-party ปัญหากลุ่มนี้หายทุกเบราว์เซอร์
 */
export const SAME_ORIGIN = "same-origin"

const DEFAULT_API_URL = "http://localhost:3001"

/**
 * คืนค่าที่ใช้ต่อหน้า path ของ API/ไฟล์อัปโหลด
 * - "same-origin" → "" (path สัมพัทธ์ เหมือนกันทั้งตอน SSR และบนเบราว์เซอร์ จึงไม่เกิด hydration mismatch)
 * - ไม่ได้ตั้ง → http://localhost:3001 (รัน `npm run dev` คู่กับ backend ตรง ๆ โดยไม่ผ่าน nginx)
 * - อย่างอื่น → ใช้ตามนั้น โดยตัด / ท้ายออก
 */
export function resolveApiBaseUrl(raw: string | undefined): string {
    const value = (raw ?? "").trim()
    if (value === SAME_ORIGIN) return ""
    if (value === "") return DEFAULT_API_URL
    return value.replace(/\/+$/, "")
}

/**
 * แปลง URL รูปที่แสดงอยู่ในฟอร์ม (imagePreview) กลับเป็น path ที่ backend เก็บ เช่น /uploads/activities/x.png
 * คืน undefined ถ้าไม่ใช่ไฟล์ที่อัปโหลดขึ้น backend แล้ว (เช่น blob: ของไฟล์ที่เพิ่งเลือก ยังไม่ได้อัปโหลด)
 *
 * รับได้ทั้ง path สัมพัทธ์ และ URL เต็มจาก origin ใดก็ได้ — ฉบับร่างที่บันทึกไว้ก่อนเปลี่ยนมาใช้ same-origin
 * เก็บ imagePreview เป็น http://api.localhost/uploads/... ไว้ ต้องยังเปิดต่อได้
 */
export function uploadPathFromPreview(preview: string | null | undefined): string | undefined {
    if (!preview) return undefined
    if (preview.startsWith("/uploads/")) return preview
    let url: URL
    try {
        url = new URL(preview)
    } catch {
        return undefined
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined
    return url.pathname.startsWith("/uploads/") ? url.pathname : undefined
}
