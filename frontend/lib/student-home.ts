/**
 * ตรรกะของหน้าหลักนักศึกษา (/student) — นับวันถึงกิจกรรม, เลือกรายการ "กำลังจะถึง", ข้อความของมาสคอต
 *
 * เป็นไฟล์ล้วน (ไม่แตะ React/DOM) และ import ได้เฉพาะไฟล์ล้วนด้วยกันผ่านนามสกุล .ts เพื่อให้ทดสอบด้วย
 * `npm test` (node --test) ได้ — ดู student-home.test.ts
 */
import { registrationBucket, type BucketableRegistration } from "./registration-bucket.ts"

/** เวลาไทยเสมอ — server เก็บเป็น UTC และ "วันนี้" ของนักศึกษาคือวันตามปฏิทินไทย ไม่ใช่ของเครื่อง */
const TIME_ZONE = "Asia/Bangkok"
const DAY_MS = 24 * 60 * 60 * 1000

function parseDate(value: string | null | undefined): Date | null {
    if (!value) return null
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
}

/** "2026-10-16" ตามปฏิทินไทย */
function bangkokDayKey(date: Date): string {
    return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date)
}

/** จำนวนวันตามปฏิทินไทยจากวันนี้ถึงวันนั้น — 0 = วันนี้, ติดลบ = ผ่านไปแล้ว, null = ไม่มีวันที่ */
export function calendarDaysUntil(iso: string | null | undefined, now: Date): number | null {
    const d = parseDate(iso)
    if (!d) return null
    return Math.round((Date.parse(bangkokDayKey(d)) - Date.parse(bangkokDayKey(now))) / DAY_MS)
}

/** ป้ายนับถอยหลังบนการ์ด "กำลังจะถึง" */
export function countdownLabel(days: number): string {
    if (days <= 0) return "วันนี้"
    if (days === 1) return "พรุ่งนี้"
    return `อีก ${days} วัน`
}

export interface UpcomingCandidate extends BucketableRegistration {
    activity: {
        approvalStatus?: string | null
        status?: string
        date: string
        startTime?: string
        /** กิจกรรมจาก wizard มีเวลาจริง — รุ่นเก่ามีแค่ date + startTime */
        startAt?: string | null
        endAt?: string | null
    }
}

/** วันแรกของกิจกรรม (ใช้กับวันที่ตัวใหญ่และการนับถอยหลัง) */
export function activityStart(a: UpcomingCandidate["activity"]): string {
    return a.startAt ?? a.date
}

function activityEnd(a: UpcomingCandidate["activity"]): string {
    return a.endAt ?? a.startAt ?? a.date
}

function sortKey(a: UpcomingCandidate["activity"]): string {
    const start = parseDate(activityStart(a))
    return `${start ? bangkokDayKey(start) : ""} ${a.startTime ?? ""}`
}

/**
 * รายการ "กำลังจะถึง" — ยังรอยืนยัน/ยืนยันแล้ว (เช็คอินแล้วหรือถูกยกเลิก ไม่ว่าโดยตัวเองหรือผู้จัด ไม่นับ —
 * กติกาเดียวกับหน้ากิจกรรมของฉัน), กิจกรรมยังไม่ถูกปิดจบ และวันสุดท้ายยังไม่ผ่าน (กิจกรรมหลายวันที่กำลังจัดอยู่ยังนับ)
 * เรียงจากวันเริ่มที่ใกล้สุด
 */
export function selectUpcoming<T extends UpcomingCandidate>(rows: T[], now: Date): T[] {
    return rows
        .filter((r) => {
            const bucket = registrationBucket(r)
            if (bucket !== "pending" && bucket !== "confirmed") return false
            if (r.activity.status === "completed") return false
            const daysToEnd = calendarDaysUntil(activityEnd(r.activity), now)
            return daysToEnd !== null && daysToEnd >= 0
        })
        .sort((a, b) => sortKey(a.activity).localeCompare(sortKey(b.activity)))
}

/** บรรทัด "ขั้นถัดไป" บนการ์ด — บอกว่านักศึกษาต้องรออะไร/ทำอะไรต่อ */
export function nextStepLabel(bucket: "pending" | "confirmed"): string {
    return bucket === "confirmed" ? "เช็คอินหน้างานวันจัดกิจกรรม" : "รอผู้จัดยืนยันที่นั่ง"
}

/** ข้อความในฟองคำพูดของมาสคอต — highlight คือส่วนที่เน้นสี; days = วันถึงกิจกรรมถัดไป (null = ไม่มีกิจกรรมที่จะถึง) */
export function mascotLine(days: number | null): { before: string; highlight: string; after: string } {
    if (days === null) return { before: "ยังไม่มีกิจกรรมที่จะถึงเลย ", highlight: "ลองหากิจกรรมใหม่", after: "ดูไหม?" }
    if (days <= 0) return { before: "", highlight: "วันนี้", after: " มีกิจกรรมแล้วนะ!" }
    if (days === 1) return { before: "", highlight: "พรุ่งนี้", after: " มีกิจกรรมแล้วนะ!" }
    return { before: "อีก ", highlight: `${days} วัน`, after: " ถึงกิจกรรมถัดไปแล้วนะ!" }
}
