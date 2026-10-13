import { resolveUploadUrl } from "./api"

interface ImageSource {
    imageUrl?: string | null
}

/**
 * ลำดับการเลือกรูปที่แสดง: รูปหน้าปกงาน (Event) -> รูปกิจกรรมย่อยแรก (Activity) -> placeholder
 * เดิมแต่ละหน้าอ่านแค่ Activity.imageUrl อย่างเดียว ทำให้รูปหน้าปกงานที่ตั้งไว้ตอนสร้างไม่แสดงที่ไหนเลย
 */
export function resolveEventImageUrl(event: ImageSource | null | undefined, activity?: ImageSource | null): string {
    const raw = eventImagePathFor(event, activity)
    return resolveUploadUrl(raw) ?? "/activity-placeholder.svg"
}

/**
 * ลำดับเดียวกันแต่คืน path ดิบ (null = ไม่มีรูป) — สำหรับปกที่ถ้าไม่มีรูปจะใช้ลายของธีมแทน placeholder
 * (หน้ารายละเอียดใช้รูปของ "รอบที่เลือก" เป็นตัวสำรอง ต่างจากการ์ดที่ใช้รอบที่จัดเร็วสุด — ดู eventImagePath)
 */
export function eventImagePathFor(event: ImageSource | null | undefined, activity?: ImageSource | null): string | null {
    return event?.imageUrl || activity?.imageUrl || null
}
