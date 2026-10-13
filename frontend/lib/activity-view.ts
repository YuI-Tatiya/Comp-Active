/**
 * ตรรกะฝั่งหน้าจอของหน้าลงทะเบียน/รายละเอียดกิจกรรม — วัน-เวลา, ที่นั่ง, สถานะ, ข้อความบนปุ่ม/การ์ด
 *
 * เป็นไฟล์ล้วน (ไม่แตะ React/DOM) และ import ได้เฉพาะไฟล์ล้วนด้วยกันผ่านนามสกุล .ts เพื่อให้ทดสอบด้วย
 * `npm test` (node --test) ได้ ข้อความไทยทั้งหมดของ "ปุ่ม/สถานะ" อยู่ที่นี่ที่เดียว คอมโพเนนต์แค่แสดงผล
 */
import { SOFT_SKILL_TIERS } from "./soft-skill-tiers.ts"

/** เวลาไทยเสมอ — server เก็บเป็น UTC และผู้ใช้อยู่ในไทย จึงไม่ปล่อยให้ขึ้นกับ timezone ของเครื่อง */
const TIME_ZONE = "Asia/Bangkok"

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

function parseDate(value: string | null | undefined): Date | null {
    if (!value) return null
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
}

function partsOf(date: Date, options: Intl.DateTimeFormatOptions): Record<string, string> {
    const parts = new Intl.DateTimeFormat("th-TH", { timeZone: TIME_ZONE, ...options }).formatToParts(date)
    return Object.fromEntries(parts.map((p) => [p.type, p.value]))
}

function dayParts(date: Date) {
    const p = partsOf(date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date)
    return { weekday: p.weekday, day: p.day, month: p.month, year: p.year, key }
}

/** ชื่อวันย่อแบบปฏิทินไทย — ICU ของ th-TH ให้ weekday "short" เป็นชื่อเต็ม ("อาทิตย์") จึงเทียบจากตารางเองแทน */
const THAI_WEEKDAY_ABBR: Record<string, string> = { Sun: "อา.", Mon: "จ.", Tue: "อ.", Wed: "พ.", Thu: "พฤ.", Fri: "ศ.", Sat: "ส." }

/** เวลา HH:mm (24 ชม.) ตามเวลาไทย */
function clock(date: Date): string {
    const p = partsOf(date, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    return `${p.hour}:${p.minute}`
}

// ─── วัน-เวลา ─────────────────────────────────────────────────────────────────

export interface ScheduleInput {
    /** กิจกรรมรุ่นเก่า: วันที่ + เวลาเป็นสตริง "09:00" */
    date?: string | null
    startTime?: string | null
    endTime?: string | null
    /** กิจกรรมที่สร้างจาก wizard: เวลาจริงแบบ ISO */
    startAt?: string | null
    endAt?: string | null
}

export interface ScheduleLabel {
    dateLabel: string
    timeLabel: string
    multiDay: boolean
}

/**
 * วัน-เวลาที่นักศึกษาอ่านแล้วเข้าใจทันที — ระบุ "น." เสมอ และกิจกรรมหลายวันแสดงเป็นช่วงวันที่
 * (เดิมแสดงเฉพาะวันแรกกับ "09:00 - 12:00" ทำให้ค่าย 4 วันดูเหมือนกิจกรรมครึ่งวัน)
 */
export function formatActivitySchedule(input: ScheduleInput): ScheduleLabel {
    const start = parseDate(input.startAt)
    const end = parseDate(input.endAt)

    if (start && end) {
        const a = dayParts(start)
        const b = dayParts(end)

        if (a.key === b.key) {
            const t1 = clock(start)
            const t2 = clock(end)
            return {
                dateLabel: `${a.weekday} ${a.day} ${a.month} ${a.year}`,
                timeLabel: t1 === t2 ? `${t1} น.` : `${t1}–${t2} น.`,
                multiDay: false,
            }
        }

        const dateLabel =
            a.month === b.month && a.year === b.year
                ? `${a.day}–${b.day} ${a.month} ${a.year}`
                : a.year === b.year
                  ? `${a.day} ${a.month} – ${b.day} ${b.month} ${b.year}`
                  : `${a.day} ${a.month} ${a.year} – ${b.day} ${b.month} ${b.year}`
        return { dateLabel, timeLabel: `${clock(start)} น. – ${clock(end)} น.`, multiDay: true }
    }

    const legacyDate = parseDate(input.date)
    const dateLabel = legacyDate
        ? (() => {
              const d = dayParts(legacyDate)
              return `${d.weekday} ${d.day} ${d.month} ${d.year}`
          })()
        : "-"
    const from = input.startTime?.trim()
    const to = input.endTime?.trim()
    const timeLabel = from && to ? `${from}–${to} น.` : from || to ? `${from || to} น.` : ""
    return { dateLabel, timeLabel, multiDay: false }
}

/** วัน-เวลาแบบสั้นสำหรับการ์ดเลือกกิจกรรม: "10 ม.ค. · 09:00–12:00 น." (หลายวัน: "10–13 ม.ค. 2570") */
export function formatScheduleShort(input: ScheduleInput): string {
    const s = formatActivitySchedule(input)
    if (s.multiDay) return s.dateLabel
    // ตัดวันในสัปดาห์และปีออก — การ์ดแคบ และวันที่เต็มอยู่ในการ์ดรายละเอียดอยู่แล้ว
    const short = s.dateLabel.replace(/^\S+\s/, "").replace(/\s\d{4}$/, "")
    return s.timeLabel ? `${short} · ${s.timeLabel}` : short
}

/**
 * วันที่ตัวใหญ่บนปกหน้ารายละเอียด: { day: "18", monthYear: "ต.ค. 2569", weekday: "อา." } — วันแรกของกิจกรรม ตามเวลาไทย
 * null = ไม่มีวันที่ให้ใช้ (ปกไม่แสดงวันที่)
 */
export function coverDateParts(input: ScheduleInput): { day: string; monthYear: string; weekday: string } | null {
    const start = parseDate(input.startAt) ?? parseDate(input.date)
    if (!start) return null
    const p = dayParts(start)
    const en = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short" }).format(start)
    return { day: p.day.padStart(2, "0"), monthYear: `${p.month} ${p.year}`, weekday: THAI_WEEKDAY_ABBR[en] ?? p.weekday }
}

/** ป้ายลำดับรอบแบบโค้ด "ROUND_01" — index เริ่มที่ 0 ตามลำดับที่ผู้จัดสร้างไว้ */
export function roundLabel(index: number): string {
    return `ROUND_${String(index + 1).padStart(2, "0")}`
}

/** วัน-เวลาปิดรับสมัคร: "20 ม.ค. 2570 17:00 น." */
export function formatDeadline(iso: string | null | undefined): string {
    const d = parseDate(iso)
    if (!d) return "-"
    const p = dayParts(d)
    return `${p.day} ${p.month} ${p.year} ${clock(d)} น.`
}

function countdownTo(iso: string | null | undefined, now: Date): string | null {
    const d = parseDate(iso)
    if (!d) return null
    const diff = d.getTime() - now.getTime()
    if (diff <= 0) return null
    const days = Math.floor(diff / DAY_MS)
    if (days >= 1) return `อีก ${days} วัน`
    const hours = Math.floor(diff / HOUR_MS)
    return hours >= 1 ? `อีก ${hours} ชั่วโมง` : "เหลือไม่ถึง 1 ชั่วโมง"
}

/** นับถอยหลังถึงเวลาปิดรับสมัคร — null ถ้าไม่ได้กำหนดหรือเลยเวลาแล้ว */
export function closeCountdown(iso: string | null | undefined, now: Date): string | null {
    return countdownTo(iso, now)
}

/** นับถอยหลังถึงเวลาเปิดรับสมัคร — null ถ้าไม่ได้กำหนดหรือถึงเวลาเปิดแล้ว */
export function openCountdown(iso: string | null | undefined, now: Date): string | null {
    return countdownTo(iso, now)
}

// ─── ที่นั่ง ──────────────────────────────────────────────────────────────────

export interface SeatInfo {
    unlimited: boolean
    capacity: number | null
    registered: number
    remaining: number | null
    /** 0-100 (ไม่จำกัด = 0) */
    percent: number
    /** low = ใช้ไปแล้วตั้งแต่ 80% */
    level: "ok" | "low" | "full"
    label: string
    shortLabel: string
}

export function seatInfo(capacity: number | null | undefined, registeredCount: number | null | undefined): SeatInfo {
    const registered = registeredCount ?? 0
    if (capacity == null) {
        return {
            unlimited: true,
            capacity: null,
            registered,
            remaining: null,
            percent: 0,
            level: "ok",
            label: "ไม่จำกัดจำนวน",
            shortLabel: "ไม่จำกัด",
        }
    }

    const remaining = Math.max(capacity - registered, 0)
    const percent = capacity > 0 ? Math.min((registered / capacity) * 100, 100) : 100
    const level = remaining === 0 ? "full" : percent >= 80 ? "low" : "ok"
    return {
        unlimited: false,
        capacity,
        registered,
        remaining,
        percent,
        level,
        label: level === "full" ? `เต็มแล้ว (${capacity} ที่นั่ง)` : `เหลือ ${remaining} จาก ${capacity} ที่นั่ง`,
        shortLabel: level === "full" ? "เต็มแล้ว" : `เหลือ ${remaining}/${capacity}`,
    }
}

// ─── สถานะการรับสมัคร ───────────────────────────────────────────────────────────

export type ClosedReason = "cancelled" | "completed" | "closed" | "not_yet_open" | "deadline_passed"

export interface RegistrationWindow {
    status: string
    approvalStatus?: string | null
    /** วันเปิดรับสมัครระดับงาน — ก่อนถึงเวลานี้สมัครไม่ได้แม้งานเผยแพร่อยู่แล้ว (backend บังคับค่านี้ตอนสมัครจริงด้วย) */
    registrationOpenAt?: string | null
    /** วันปิดรับสมัครระดับงาน — backend บังคับค่านี้ตอนสมัครจริงด้วย (ไม่ใช่แค่แสดงผล) */
    registrationCloseAt?: string | null
}

/** สาเหตุที่สมัครไม่ได้ — เรียงความสำคัญ: ยกเลิก > จบแล้ว > ปิดรับ > ยังไม่เปิด > หมดเขต; null = ยังเปิดรับ */
export function closedReason(w: RegistrationWindow, now: Date): ClosedReason | null {
    if (w.approvalStatus === "cancelled") return "cancelled"
    if (w.status === "completed") return "completed"
    if (w.status !== "open") return "closed"
    const openAt = parseDate(w.registrationOpenAt)
    if (openAt && openAt.getTime() > now.getTime()) return "not_yet_open"
    const deadline = parseDate(w.registrationCloseAt)
    if (deadline && deadline.getTime() <= now.getTime()) return "deadline_passed"
    return null
}

export interface MyRegState {
    status: string
    attendance?: string | null
}

export interface MyRegistrationLike extends MyRegState {
    activity?: { id: number }
}

/** ใบลงทะเบียนของฉันที่ใช้บอกสถานะของกิจกรรมนี้: ข้ามใบที่ยกเลิก; ถ้ามีหลายใบ เช็คอินแล้ว > ยืนยันแล้ว > รอยืนยัน */
export function pickMyRegistration<T extends MyRegistrationLike>(rows: T[], activityId: number): T | undefined {
    const rank = (r: T) => (r.attendance === "attended" ? 3 : r.status === "confirmed" ? 2 : 1)
    return rows
        .filter((r) => r.activity?.id === activityId && r.status !== "cancelled")
        .sort((a, b) => rank(b) - rank(a))[0]
}

export type SessionTag = "attended" | "registered" | "pending" | "closed" | "full" | "low" | "open"

/** ป้ายสถานะบนปุ่มเลือกกิจกรรม — ของฉันมาก่อนเสมอ แล้วค่อยปิดรับ > เต็ม > เหลือน้อย */
export function sessionTag(input: { seat: SeatInfo; closed: ClosedReason | null; mine?: MyRegState }): SessionTag {
    const { seat, closed, mine } = input
    if (mine?.attendance === "attended") return "attended"
    if (mine?.status === "confirmed") return "registered"
    if (mine?.status === "pending") return "pending"
    if (closed) return "closed"
    if (seat.level === "full") return "full"
    if (seat.level === "low") return "low"
    return "open"
}

/** จำนวนกิจกรรมอื่นที่ยังสมัครได้ — ใช้ชวนไปเลือกกิจกรรมอื่นเมื่อกิจกรรมนี้เต็ม */
export function countOpenAlternatives(tags: { id: number; tag: SessionTag }[], activeId: number): number {
    return tags.filter((t) => t.id !== activeId && (t.tag === "open" || t.tag === "low")).length
}

// ─── การ์ดสมัคร (Action Card) ─────────────────────────────────────────────────────

export type ActionKind = "open" | "pending" | "registered" | "attended" | "full" | "closed"
export type ActionTone = "brand" | "warning" | "success" | "info" | "neutral"

export interface ActionView {
    kind: ActionKind
    tone: ActionTone
    /** ข้อความสถานะหลักในแบนเนอร์ (null = ไม่มีแบนเนอร์: ยังไม่ได้สมัคร/เต็ม/ปิดรับ ซึ่งบอกเหตุผลบนปุ่มที่ปิดใช้งานแล้ว) */
    headline: string | null
    /** ข้อความประกอบ: ใต้หัวข้อในแบนเนอร์ หรือเป็นบรรทัดเล็กๆ เมื่อไม่มีแบนเนอร์ */
    detail: string | null
    primary: { label: string; disabled: boolean } | null
    canCancel: boolean
    cancelLabel: string | null
    /** บรรทัดวันปิดรับสมัคร (เฉพาะตอนเปิดรับ) */
    deadline: string | null
    alternativesHint: string | null
    link: { label: string; target: "my-registrations" } | null
}

const REGISTER_LABEL: Record<string, string> = {
    participant: "ลงทะเบียนเข้าร่วม",
    staff_volunteer: "สมัครเป็นสตาฟฟ์",
    contestant: "ลงทะเบียนเข้าแข่งขัน",
}

const CLOSED_LABEL: Record<ClosedReason, string> = {
    deadline_passed: "หมดเขตรับสมัคร",
    completed: "กิจกรรมจบแล้ว",
    cancelled: "กิจกรรมถูกยกเลิก",
    closed: "ปิดรับสมัคร",
    not_yet_open: "ยังไม่เปิดรับสมัคร",
}

export interface ActionInput {
    registrationType?: string | null
    seat: SeatInfo
    closed: ClosedReason | null
    mine?: MyRegState
    openAt?: string | null
    closeAt?: string | null
    now: Date
    /** จำนวนกิจกรรมอื่นในงานเดียวกันที่ยังสมัครได้ */
    openAlternatives: number
}

/** สถานะและข้อความทั้งหมดของการ์ดสมัคร — สีเขียวเฉพาะ "ลงทะเบียนสำเร็จ" จริง (รอผู้จัดยืนยันเป็นสีเหลือง) */
export function describeAction(input: ActionInput): ActionView {
    const { seat, closed, mine, now } = input
    const empty = {
        headline: null,
        detail: null,
        primary: null,
        canCancel: false,
        cancelLabel: null,
        deadline: null,
        alternativesHint: null,
        link: null,
    }

    if (mine?.attendance === "attended") {
        return {
            ...empty,
            kind: "attended",
            tone: "info",
            headline: "เข้าร่วมแล้ว",
            detail: "ขอบคุณที่มาร่วมกิจกรรม — ดูคะแนนและทำแบบสำรวจได้ที่กิจกรรมของฉัน",
            link: { label: "ไปที่กิจกรรมของฉัน", target: "my-registrations" },
        }
    }

    // สมัครแล้วแต่กิจกรรมจบ/ถูกยกเลิก ไม่มีประโยชน์ที่จะยกเลิกการสมัครอีก
    const cancellable = closed !== "completed" && closed !== "cancelled"
    const registeredDetail =
        closed === "cancelled"
            ? "กิจกรรมนี้ถูกยกเลิกโดยผู้จัด"
            : closed === "completed"
              ? "กิจกรรมนี้จบแล้ว"
              : null

    if (mine?.status === "confirmed") {
        return {
            ...empty,
            kind: "registered",
            tone: "success",
            headline: "ลงทะเบียนสำเร็จ",
            detail: registeredDetail ?? "อย่าลืมสแกน QR เช็คอินหน้างานในวันจัดกิจกรรม",
            canCancel: cancellable,
            cancelLabel: cancellable ? "ยกเลิกการลงทะเบียน" : null,
            link: { label: "ดูในกิจกรรมของฉัน", target: "my-registrations" },
        }
    }

    if (mine?.status === "pending") {
        return {
            ...empty,
            kind: "pending",
            tone: "warning",
            headline: "ส่งคำขอแล้ว — รอผู้จัดยืนยัน",
            detail: registeredDetail ?? "เมื่อผู้จัดยืนยัน สถานะจะเปลี่ยนเป็น “ลงทะเบียนสำเร็จ”",
            canCancel: cancellable,
            cancelLabel: cancellable ? "ยกเลิกคำขอ" : null,
            link: { label: "ดูในกิจกรรมของฉัน", target: "my-registrations" },
        }
    }

    const alternativesHint = input.openAlternatives > 0 ? `ดูกิจกรรมอื่นที่ยังว่าง (${input.openAlternatives})` : null

    if (closed) {
        // เหตุผลอยู่บนป้ายของปุ่มที่ปิดใช้งานแล้ว — ไม่ทำแบนเนอร์ซ้ำอีกชั้น ยกเว้น "ยังไม่เปิด" ที่บอกเวลาเปิดเพิ่มให้มีประโยชน์
        let detail: string | null = null
        if (closed === "not_yet_open" && input.openAt) {
            const countdown = openCountdown(input.openAt, now)
            detail = `เปิดรับสมัคร ${formatDeadline(input.openAt)}${countdown ? ` (${countdown})` : ""}`
        }
        return {
            ...empty,
            kind: "closed",
            tone: "neutral",
            primary: { label: CLOSED_LABEL[closed], disabled: true },
            detail,
            alternativesHint,
        }
    }

    if (seat.level === "full") {
        return {
            ...empty,
            kind: "full",
            tone: "neutral",
            detail: "หากมีผู้ยกเลิก ที่นั่งอาจว่างอีกครั้ง",
            primary: { label: "เต็มแล้ว", disabled: true },
            alternativesHint,
        }
    }

    const countdown = closeCountdown(input.closeAt, now)
    return {
        ...empty,
        kind: "open",
        tone: "brand",
        primary: { label: REGISTER_LABEL[input.registrationType ?? "participant"] ?? REGISTER_LABEL.participant, disabled: false },
        deadline: input.closeAt && countdown ? `ปิดรับสมัคร ${formatDeadline(input.closeAt)} (${countdown})` : null,
    }
}

// ─── สิ่งที่จะได้รับ ────────────────────────────────────────────────────────────

export interface SkillBenefit {
    skillType: string
    rate: number | null
    /** "ผ่าน" / "ดี" / "ดีเยี่ยม" (ข้อมูลรุ่นเก่าที่ไม่ใช่ 1/2/3 = "ระดับ N", ไม่มี rate = "") */
    levelLabel: string
    /** จำนวนจุดที่เติม 0-3 */
    dots: 0 | 1 | 2 | 3
}

const TIER_DOTS: Record<number, 1 | 2 | 3> = { 1: 1, 2: 2, 3: 3 }

/**
 * แปลงระดับที่ผู้จัดตั้งไว้ (1/2/3) เป็นคำที่นักศึกษาเข้าใจ — เดิมแสดง "น้ำหนัก 5/5" ซึ่งผิดความหมาย
 * เพราะเลขนี้คือระดับพฤติกรรม ไม่ใช่น้ำหนักเต็ม 5
 */
export function describeSkillBenefits(softSkills: { skillType: string; rate?: number | null }[] | undefined | null): SkillBenefit[] {
    return (softSkills ?? []).map((s) => {
        if (s.rate == null) return { skillType: s.skillType, rate: null, levelLabel: "", dots: 0 }
        const tier = SOFT_SKILL_TIERS.find((t) => t.value === s.rate)
        if (tier) return { skillType: s.skillType, rate: s.rate, levelLabel: tier.label, dots: TIER_DOTS[tier.value] }
        const dots = Math.min(3, Math.max(1, Math.round((s.rate / 5) * 3))) as 1 | 2 | 3
        return { skillType: s.skillType, rate: s.rate, levelLabel: `ระดับ ${s.rate}`, dots }
    })
}

/** ระดับสุดท้ายในกิจกรรมโหมด 360° รู้หลังผู้จัดอนุมัติ ไม่ใช่ตอนเช็คอิน */
export const THREE_SIXTY_NOTE = "ระดับสุดท้ายผู้จัดจะประเมินหลังจบกิจกรรม (สูงสุด ดีเยี่ยม)"

export interface VolunteerBenefit {
    gives: boolean
    hoursLabel: string | null
    role: string | null
    condition: string
    loanNote: string | null
}

function formatHours(hours: string | number | null | undefined): string | null {
    const n = Number(hours)
    if (hours == null || !Number.isFinite(n) || n <= 0) return null
    return `${Number.isInteger(n) ? n : parseFloat(n.toFixed(2))} ชม.`
}

/** เงื่อนไขชั่วโมงจิตอาสา — ต้องบอกชัดทั้งกรณีแจกและไม่แจก (Prisma Decimal ส่งมาเป็น string เสมอ) */
export function describeVolunteer(input: { volunteerRole?: string | null; volunteerHours?: string | number | null }): VolunteerBenefit {
    const role = input.volunteerRole?.trim() || null
    if (!role) {
        return { gives: false, hoursLabel: null, role: null, condition: "กิจกรรมนี้ไม่ออกใบรับรองจิตอาสา", loanNote: null }
    }
    return {
        gives: true,
        hoursLabel: formatHours(input.volunteerHours),
        role,
        condition: "รับชั่วโมงเมื่อเข้าร่วมและเช็คอินเรียบร้อย",
        loanNote: "ใช้ยื่นขอ กยศ. หรือทุนการศึกษาได้ — เลือกตอนลงทะเบียน",
    }
}
