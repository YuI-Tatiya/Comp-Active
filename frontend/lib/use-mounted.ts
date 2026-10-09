"use client"

import { useSyncExternalStore } from "react"

// ไม่มีอะไรให้ subscribe จริงๆ — ค่าเปลี่ยนจาก false เป็น true แค่ครั้งเดียวตอน mount เสร็จ
const subscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

/**
 * true เมื่อ component mount ที่ฝั่ง client แล้ว (เช่นก่อนเรียก createPortal ไปที่ document.body
 * ซึ่งไม่มีตอน SSR) — false เสมอระหว่าง SSR/hydration แรก
 *
 * ใช้ useSyncExternalStore แทน useState+useEffect(() => setMounted(true)) ตรงๆ เพราะแบบหลังโดน
 * react-hooks/set-state-in-effect (เรียก setState ใน effect ทำให้ render ซ้อนรอบ) — เหมือนที่แก้ไปแล้ว
 * ที่ app/student/my-registrations/page.tsx (ดู lib/use-scan-capable.ts ที่ใช้วิธีเดียวกัน)
 */
export function useMounted(): boolean {
    return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)
}
