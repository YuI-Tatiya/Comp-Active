import { API_BASE_URL } from "./api"

interface ImageSource {
    imageUrl?: string | null
}

/**
 * ลำดับการเลือกรูปที่แสดง: รูปหน้าปกงาน (Event) -> รูปกิจกรรมย่อยแรก (Activity) -> placeholder
 * เดิมแต่ละหน้าอ่านแค่ Activity.imageUrl อย่างเดียว ทำให้รูปหน้าปกงานที่ตั้งไว้ตอนสร้างไม่แสดงที่ไหนเลย
 */
export function resolveEventImageUrl(event: ImageSource | null | undefined, activity?: ImageSource | null): string {
    const raw = event?.imageUrl ?? activity?.imageUrl
    return raw ? `${API_BASE_URL}${raw}` : "/activity-placeholder.svg"
}
