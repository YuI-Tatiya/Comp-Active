/**
 * ระดับพฤติกรรม Soft Skills 3 ระดับ — แยกเป็นไฟล์ที่ไม่ import อะไรเลย เพื่อให้ตรรกะฝั่งหน้าจอที่ต้องใช้ป้ายระดับ
 * (lib/activity-view.ts) ทดสอบด้วย node --test ได้โดยไม่ต้องลาก lucide-react เข้ามา
 * soft-skills.ts re-export ทั้งสองตัวจึงยัง import จากที่เดิมได้
 */

/** ป้ายพฤติกรรมที่สังเกตได้ 3 ระดับ — ค่า value คือระดับที่บันทึกจริงเบื้องหลัง */
export const SOFT_SKILL_TIERS: { value: 1 | 2 | 3; label: string; hint: string }[] = [
    { value: 1, label: "ผ่าน", hint: "ทำตามที่ได้รับมอบหมายสำเร็จ ไม่ต้องเตือนซ้ำ" },
    { value: 2, label: "ดี", hint: "ริเริ่มเอง แก้ปัญหาระดับย่อยได้ด้วยตนเอง" },
    { value: 3, label: "ดีเยี่ยม", hint: "รับผิดชอบผลลัพธ์ภาพรวม นำ/มอบหมายงานให้ผู้อื่นได้" },
]

/** ป้ายพฤติกรรมของระดับที่บันทึกไว้ — ใช้แสดงผลใน summary/badge ต่างๆ แทนตัวเลขดิบ */
export function softSkillTierLabel(rate: number): string {
    return SOFT_SKILL_TIERS.find((t) => t.value === rate)?.label ?? `ระดับ ${rate}`
}
