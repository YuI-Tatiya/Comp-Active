/**
 * ช่วงวันที่แบบกระชับ (การ์ดหน้าหลักผู้จัด) — รวบส่วนที่ซ้ำกัน: "10 – 16 ต.ค. 2569" (เดือนเดียวกัน),
 * "30 ต.ค. – 2 พ.ย. 2569" (ปีเดียวกัน), ข้ามปีแสดงเต็มทั้งสองฝั่ง, วันเดียวกันแสดงวันเดียว
 * ช่องการ์ดแคบ (~300px) ข้อความเต็มแบบ formatRegistrationWindow ปกติถูกตัด "…" จนวันปิดรับสมัครหายไปทั้งวัน
 *
 * รับ ISO หรือ epoch ms — วันเริ่มใช้ไม่ได้ (เช่น งานที่ไม่มีกิจกรรมย่อย = Infinity) คืน "ไม่ระบุวันที่",
 * วันจบใช้ไม่ได้แสดงวันเริ่มวันเดียว · เทียบวัน/เดือน/ปีตามเวลาไทยเสมอ (เหมือน formatEventDate ใน event-card.tsx)
 * ไม่งั้นงานที่คร่อมเที่ยงคืนตาม UTC จะถูกนับเป็นคนละวันทั้งที่เป็นวันเดียวกันตามเวลาไทย
 */
export function formatCompactDateSpan(start: string | number, end: string | number): string {
    const s = new Date(start)
    const e = new Date(end)
    if (Number.isNaN(s.getTime())) return "ไม่ระบุวันที่"

    const a = thaiDateParts(s)
    if (Number.isNaN(e.getTime())) return `${a.day} ${a.month} ${a.year}`

    const b = thaiDateParts(e)
    if (a.year !== b.year) return `${a.day} ${a.month} ${a.year} – ${b.day} ${b.month} ${b.year}`
    if (a.month !== b.month) return `${a.day} ${a.month} – ${b.day} ${b.month} ${b.year}`
    if (a.day !== b.day) return `${a.day} – ${b.day} ${b.month} ${b.year}`
    return `${a.day} ${a.month} ${a.year}`
}

const THAI_DATE = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
})

function thaiDateParts(d: Date): { day: string; month: string; year: string } {
    const parts = THAI_DATE.formatToParts(d)
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ""
    return { day: get("day"), month: get("month"), year: get("year") }
}
