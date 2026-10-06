/**
 * ยูทิลของแถบหัวเรื่อง (components/ui/hero-banner.tsx) — ไม่ import อะไรเลย เพื่อทดสอบด้วย node --test ได้
 */

export interface HeadlinePart {
    text: string
    /** true = ช่องว่าง/เครื่องหมายที่ไม่ใช่คำ (ไม่ต้องห่อด้วยแอนิเมชัน) */
    isSpace: boolean
}

/**
 * แบ่งหัวข้อเป็นหน่วยสำหรับแอนิเมชันเปิดทีละคำ — ใช้ Intl.Segmenter("th") เพราะภาษาไทยไม่มีช่องว่างคั่นคำ
 * (แบ่งตามช่องว่างอย่างเดียวจะได้ทั้งประโยคเป็นก้อนเดียว) และไม่ตัดกลางสระ/วรรณยุกต์
 * ต่อ text ของทุกหน่วยกลับได้เท่าข้อความเดิมเสมอ; เบราว์เซอร์ที่ไม่มี Segmenter ตกไปแบ่งตามช่องว่าง
 */
export function splitHeadline(text: string): HeadlinePart[] {
    if (!text) return []

    if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
        const segmenter = new Intl.Segmenter("th", { granularity: "word" })
        return Array.from(segmenter.segment(text), (s) => ({ text: s.segment, isSpace: !s.isWordLike }))
    }

    return text
        .split(/(\s+)/)
        .filter((part) => part !== "")
        .map((part) => ({ text: part, isSpace: /^\s+$/.test(part) }))
}

/** ดัชนีคำถัดไปของคำที่สลับอัตโนมัติ (วนกลับที่ 0) — รายการว่างหรือมีคำเดียวคงที่ที่ 0 */
export function nextWordIndex(current: number, count: number): number {
    if (count <= 1) return 0
    return (current + 1) % count
}
