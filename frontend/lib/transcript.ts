// lib/transcript.ts
/**
 * ยูทิลของเอกสารรับรองผล Soft Skills — ไม่ import อะไรจาก "@/..." หรือ lucide-react เพื่อให้ทดสอบด้วย node --test ได้
 * (ตัวเอกสารที่ต้องใช้ไอคอน/ป้ายทักษะส่งรายการ skills เข้ามาทางพารามิเตอร์แทน)
 * กฎรหัสต้องตรงกับ backend: modules/shared/skill-transcripts/skill-transcript-code.util.ts
 */

export interface SkillTranscriptSnapshot {
    version: 1
    holder: { name: string; studentId: string | null }
    summary: { totalScore: number; activityCount: number; overallAverage: number }
    averages: Record<string, number>
    activities: { name: string; date: string; totalScore: number }[]
}

export type VerifyResult =
    | { status: "valid"; code: string; issuedAt: string; snapshot: SkillTranscriptSnapshot }
    | { status: "revoked"; code: string; revokedAt: string }
    | { status: "not_found" }

export interface TranscriptListItem {
    code: string
    issuedAt: string
    revokedAt: string | null
    activityCount: number
    totalScore: number
}

const VALID_CODE = /^[0-9A-HJKMNP-TV-Z]{16}$/

/** รับรหัสที่ผู้ใช้พิมพ์/วางมา — คืนรูปแบบมาตรฐาน (ไม่มีขีด พิมพ์ใหญ่) หรือ null */
export function normalizeTranscriptCode(input: string): string | null {
    const cleaned = input
        .toUpperCase()
        .replace(/[\s-]/g, "")
        .replace(/O/g, "0")
        .replace(/[IL]/g, "1")
    return VALID_CODE.test(cleaned) ? cleaned : null
}

/** ถอดรหัสพารามิเตอร์ใน URL แบบไม่ throw — `/verify/%` ไม่ควรทำให้หน้าพัง (ถอดไม่ได้ก็ใช้ค่าดิบ ซึ่งจะถูก normalize เป็น null → "ไม่พบเอกสาร") */
export function decodeCodeParam(raw: string): string {
    try {
        return decodeURIComponent(raw)
    } catch {
        return raw
    }
}

/** XXXX-XXXX-XXXX-XXXX สำหรับแสดงผล */
export function formatTranscriptCode(code: string): string {
    const normalized = normalizeTranscriptCode(code) ?? code.toUpperCase()
    return normalized.match(/.{1,4}/g)?.join("-") ?? normalized
}

/** 6 ตุลาคม 2569 — ตามเขตเวลาไทย กันวันเลื่อนเมื่อเซิร์ฟเวอร์/เครื่องผู้ใช้อยู่คนละเขตเวลา */
export function formatThaiDate(iso: string): string {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return "—"
    return date.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Bangkok",
    })
}

/** ค่าเฉลี่ย 0–5 → เปอร์เซ็นต์ความกว้างของแถบ */
export function levelPercent(average: number): number {
    return Math.min(100, Math.max(0, (average / 5) * 100))
}

export interface SkillRow {
    n: number
    field: string
    label: string
    labelEn: string
    average: number
    percent: number
}

/** แปลง snapshot เป็นแถวตาราง/จุดกราฟ ตามลำดับทักษะที่ส่งเข้ามา (ทักษะที่ไม่มีใน snapshot = 0) */
export function snapshotToSkillRows(
    snapshot: SkillTranscriptSnapshot,
    skills: { field: string; label: string; labelEn: string }[],
): SkillRow[] {
    return skills.map((s, i) => {
        const average = snapshot.averages[s.field] ?? 0
        return { n: i + 1, field: s.field, label: s.label, labelEn: s.labelEn, average, percent: levelPercent(average) }
    })
}
