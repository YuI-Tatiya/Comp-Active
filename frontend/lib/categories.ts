/**
 * หมวดหมู่กิจกรรม — ค่า value ตรงกับที่ backend เก็บใน Activity.category
 * สีใช้เฉพาะจุดเล็ก (จุดนำหน้า, badge, ขอบซ้าย) ไม่ใช้เป็นพื้นการ์ดทั้งใบ
 */
export interface CategoryMeta {
    value: string
    label: string
    /** class สำหรับจุด/แถบสี */
    dot: string
    /** class สำหรับ badge (พื้นอ่อน + ตัวอักษรเข้ม) */
    badge: string
}

export const CATEGORIES: CategoryMeta[] = [
    {
        value: "Technology",
        label: "เทคโนโลยี",
        dot: "bg-cat-tech",
        badge: "bg-cat-tech-bg text-cat-tech",
    },
    {
        value: "Academic",
        label: "วิชาการ",
        dot: "bg-cat-academic",
        badge: "bg-cat-academic-bg text-cat-academic",
    },
    {
        value: "Competition",
        label: "การแข่งขัน",
        dot: "bg-cat-competition",
        badge: "bg-cat-competition-bg text-cat-competition",
    },
    {
        value: "Volunteer",
        label: "อาสาสมัคร",
        dot: "bg-cat-volunteer",
        badge: "bg-cat-volunteer-bg text-cat-volunteer",
    },
    {
        value: "Sports",
        label: "กีฬา",
        dot: "bg-cat-sports",
        badge: "bg-cat-sports-bg text-cat-sports",
    },
    {
        value: "Art & Culture",
        label: "ศิลปะ",
        dot: "bg-cat-art",
        badge: "bg-cat-art-bg text-cat-art",
    },
]

const BY_VALUE = new Map(CATEGORIES.map((c) => [c.value, c]))

export function getCategory(value?: string | null): CategoryMeta | undefined {
    return value ? BY_VALUE.get(value) : undefined
}

export function categoryLabel(value?: string | null): string {
    return getCategory(value)?.label ?? value ?? ""
}
