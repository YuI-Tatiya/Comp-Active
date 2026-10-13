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
 * แปลง URL รูปที่แสดงอยู่ในฟอร์ม (imagePreview) กลับเป็น path/URL ที่ backend เก็บจริง
 * คืน undefined ถ้าไม่ใช่ไฟล์ที่อัปโหลดขึ้น backend แล้ว (เช่น blob: ของไฟล์ที่เพิ่งเลือก ยังไม่ได้อัปโหลด)
 *
 * backend เก็บค่านี้ได้ 2 แบบแล้วแต่ว่าตั้งค่า R2 ไว้หรือไม่ (ดู backend storage.config.ts):
 * - path สัมพัทธ์ /uploads/... (ยังไม่ได้ตั้ง R2 — ไฟล์อยู่บนดิสก์ served same-origin)
 * - URL เต็มของโดเมน R2/CDN (ตั้ง R2 แล้ว) — คืนค่าตามนั้นตรง ๆ ไม่ตัดเหลือแค่ pathname อีกต่อไป
 *   เพราะ pathname เพียวๆ ใช้ต่อ URL ไม่ได้ (คนละ origin กับหน้าเว็บ)
 *
 * ข้อยกเว้นเดียว: preview ที่เป็น URL เต็มแต่ pathname ขึ้นต้นด้วย /uploads/ คือฉบับร่างเก่าก่อนเปลี่ยน
 * มาใช้ same-origin (เคยเก็บ imagePreview เป็น http://api.localhost/uploads/... ไว้) — ลดเหลือ path
 * สัมพัทธ์เหมือนเดิม ไม่ใช่ URL เต็มของ origin เก่าที่อาจใช้ไม่ได้แล้ว
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
    if (url.pathname.startsWith("/uploads/")) return url.pathname
    return preview
}

/**
 * เติม API_BASE_URL ให้ path ที่ backend เก็บ เพื่อใช้เป็น src/href ตรง ๆ
 * - URL เต็มอยู่แล้ว (R2/CDN) → คืนตามนั้น ไม่ต่อ API_BASE_URL ซ้ำ (ต่อซ้ำแล้วพังทันทีถ้า
 *   API_BASE_URL ไม่ใช่ค่าว่าง เช่นตอน `npm run dev` เปล่า ๆ ที่ API_BASE_URL = http://localhost:3001)
 * - path สัมพัทธ์ /uploads/... → ต่อ API_BASE_URL ตามเดิม
 */
export function buildUploadUrl(path: string | null | undefined, apiBaseUrl: string): string | null {
    if (!path) return null
    if (/^https?:\/\//i.test(path)) return path
    return `${apiBaseUrl}${path}`
}
