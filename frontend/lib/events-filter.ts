import type { Activity, EventSummary } from "@/lib/api"
import { CATEGORIES } from "@/lib/categories"

/**
 * ตรรกะกรอง/เรียงรายการกิจกรรม ใช้ร่วมกันระหว่าง /events (สาธารณะ) และ /student/events
 *
 * เดิมโค้ดส่วนนี้ถูกก๊อปไว้ทั้งสองหน้า ทำให้บั๊กกระจายตามกันไปด้วย (เช่น createdAt ที่เอา
 * วันจัดงานมาใช้แทนวันประกาศ) จึงรวมมาไว้จุดเดียว ส่วนการประกอบข้อมูลเป็นการ์ดยังแยกกัน
 * เพราะสองหน้าแสดงผลคนละแบบ
 */

export interface EventsFilterValues {
    search: string
    categories: string[]
    statuses: string[]
    certOnly: boolean
    range: string
    sort: string
}

export const INITIAL_FILTERS: EventsFilterValues = {
    search: "",
    categories: [],
    statuses: [],
    certOnly: false,
    range: "",
    sort: "soon",
}

export const STATUS_OPTIONS = [
    { value: "open", label: "เปิดรับสมัคร" },
    { value: "closed", label: "ปิดรับสมัคร" },
]

export const RANGE_OPTIONS = [
    { value: "", label: "ทุกช่วงเวลา" },
    { value: "today", label: "วันนี้-พรุ่งนี้" },
    { value: "week", label: "ภายใน 7 วัน" },
    { value: "month", label: "ภายใน 30 วัน" },
]

/**
 * ป้ายเขียนด้วยภาษาที่ผู้ใช้คิด ไม่ใช่ชื่อฟิลด์ในระบบ และระบุทิศทางเสมอ
 *
 * มี "วันจัดงาน" ทั้งสองทิศทาง เพราะ backend ส่งกิจกรรมที่จบไปแล้วมาด้วย (findAllApproved
 * ไม่กรองวันที่) ถ้าเรียงได้ทางเดียวจะดันกิจกรรมเก่าขึ้นบนสุดโดยไม่มีทางสลับ
 */
export const SORT_OPTIONS = [
    { value: "soon", label: "วันจัดงาน: ใกล้ถึงก่อน" },
    { value: "latest", label: "วันจัดงาน: ไกลสุดก่อน" },
    { value: "newest", label: "กิจกรรมที่เพิ่งลงประกาศ" },
    { value: "seats", label: "ที่นั่งว่าง: เหลือเยอะก่อน" },
    { value: "name", label: "ชื่อกิจกรรม: ก → ฮ" },
]

/** อธิบายความต่างของแต่ละตัวเลือก โดยเฉพาะ "วันจัดงาน" กับ "วันที่ลงประกาศ" ที่คนละอย่างกัน */
export const SORT_HELP =
    "“วันจัดงาน” คือวันที่กิจกรรมจัดขึ้นจริง ส่วน “กิจกรรมที่เพิ่งลงประกาศ” " +
    "จะเรียงจากกิจกรรมที่ผู้จัดเพิ่งเปิดในระบบล่าสุด เลือกอันนี้เมื่ออยากเห็นของใหม่ที่เพิ่งมาก่อน " +
    "โดยไม่สนว่าจะจัดวันไหน"

export const RANGE_HELP =
    "กรองจากวันที่จัดกิจกรรม โดยนับวันนี้เป็นวันแรก เช่น “ภายใน 7 วัน” " +
    "คือกิจกรรมที่จัดตั้งแต่วันนี้ไปจนถึงอีก 6 วันข้างหน้า (กิจกรรมที่ผ่านไปแล้วจะไม่ติดมา)"

/** จำนวน "วันตามปฏิทิน" ที่แต่ละช่วงครอบคลุม นับรวมวันนี้เป็นวันแรก */
const RANGE_DAYS: Record<string, number> = {
    today: 2, // วันนี้ + พรุ่งนี้
    week: 7,
    month: 30,
}

/**
 * ฟิลด์ที่จำเป็นต่อการกรอง/เรียง — แต่ละหน้าเอาไปประกอบกับข้อมูลของตัวเองได้
 * (หน้าสาธารณะแนบ Activity ทั้งก้อนไว้เพื่อแสดงวันที่/สถานที่/ที่นั่งบนการ์ด)
 */
export interface FilterableItem {
    name: string
    /**
     * หมวดหมู่ทั้งหมดของการ์ดนี้ — กิจกรรมเดียวเลือกได้มากกว่า 1 หมวด และงาน (Event) ที่มี
     * กิจกรรมย่อยหลายตัวคนละหมวดก็ต้องโผล่ในทุกหมวดที่เกี่ยวข้อง ไม่ใช่แค่หมวดเดียว
     */
    categories: string[]
    status: "open" | "closed"
    searchText: string
    /** วันจัดกิจกรรม (epoch ms) — ใช้กรองช่วงเวลาและเรียง "ใกล้ถึงก่อน" */
    sortDate: number
    /** วันที่ประกาศกิจกรรม (epoch ms) — ใช้เรียง "ล่าสุดก่อน" */
    createdAt: number
    /** ที่นั่งคงเหลือ — null = ไม่จำกัดจำนวน */
    seats: number | null
    hasCert: boolean
}

/**
 * true ถ้าวันจัดกิจกรรมอยู่ในช่วงที่เลือก — "" = ไม่กรอง
 *
 * ใช้ขอบเขต "วันตามปฏิทิน" (เที่ยงคืนวันนี้ ถึงสิ้นวันสุดท้ายของช่วง) ไม่ใช่ 24 ชม.กลิ้ง
 * เพื่อให้พฤติกรรมตรงกับป้ายกำกับ เดิมใช้ now-1วัน เป็นขอบล่างทุกช่วง ทำให้ "วันนี้-พรุ่งนี้"
 * ดึงกิจกรรมของเมื่อวานติดมาด้วย
 */
export function withinRange(sortDate: number, range: string): boolean {
    if (!range) return true
    if (!Number.isFinite(sortDate)) return false

    const days = RANGE_DAYS[range]
    if (!days) return true

    const start = new Date()
    start.setHours(0, 0, 0, 0)

    const end = new Date(start)
    end.setDate(end.getDate() + days - 1)
    end.setHours(23, 59, 59, 999)

    return sortDate >= start.getTime() && sortDate <= end.getTime()
}

/**
 * แปลงกิจกรรมเดี่ยวเป็นฟิลด์สำหรับกรอง/เรียง
 *
 * createdAt ใช้ค่าจริงจาก backend (Prisma ส่งมาทุก scalar อยู่แล้ว) ถ้าไม่มีค่อย fallback
 * ไปวันจัดงาน — เดิมทั้งสองหน้าใช้วันจัดงานเสมอ ทำให้ "เรียงตามวันที่ประกาศ" ไม่ตรงความหมาย
 */
export function activityFilterFields(a: Activity): FilterableItem {
    return {
        name: a.name,
        categories: a.categories,
        status: a.status === "open" ? "open" : "closed",
        searchText: [a.name, ...a.categories].filter(Boolean).join(" ").toLowerCase(),
        sortDate: new Date(a.date).getTime(),
        createdAt: new Date(a.createdAt ?? a.date).getTime(),
        seats: a.capacity == null ? null : Math.max(a.capacity - (a.registeredCount ?? 0), 0),
        hasCert: !!a.volunteerRole,
    }
}

/** การ์ดรวม — งาน (Event, หลายกิจกรรมย่อย) และกิจกรรมเดี่ยว normalize มาเป็นรูปแบบเดียวกัน */
export interface FeaturedCardItem extends FilterableItem {
    key: string
    imageUrl?: string | null
    description?: string | null
    href: string
}

function nearestUpcomingActivity(ev: EventSummary) {
    return [...ev.activities].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
}

function earliestEventDate(ev: EventSummary): number {
    const times = ev.activities.map((a) => new Date(a.date).getTime()).filter((t) => !Number.isNaN(t))
    return times.length ? Math.min(...times) : Number.POSITIVE_INFINITY
}

/**
 * รวม Event และกิจกรรมเดี่ยวเป็นการ์ดเดียวกัน — งานหนึ่งงาน (ไม่ว่าจะมีกี่กิจกรรมย่อย) = การ์ดเดียวเสมอ
 * ใช้กับส่วน "แนะนำ"/"กำลังเปิดรับสมัคร" แบบย่อในหน้าแรก (public และ student) — หน้ารายการเต็ม
 * (/events, /student/events) มีตรรกะจัดกลุ่มตามหมวดหมู่ของตัวเองที่ละเอียดกว่านี้ ไม่ได้ใช้ตัวนี้
 */
export function buildFeaturedCards(
    events: EventSummary[],
    standalone: Activity[],
    hrefFor: { event: (id: number) => string; activity: (id: number) => string }
): FeaturedCardItem[] {
    const fromEvents = events.map((ev): FeaturedCardItem => {
        const fa = nearestUpcomingActivity(ev)
        return {
            key: `event-${ev.id}`,
            name: ev.name,
            imageUrl: ev.imageUrl ?? fa?.imageUrl,
            description: ev.description,
            categories: Array.from(new Set(ev.activities.flatMap((a) => a.categories))),
            status: ev.activities.some((a) => a.status === "open") ? "open" : "closed",
            searchText: [ev.name, ...ev.activities.map((a) => a.name)].join(" ").toLowerCase(),
            sortDate: earliestEventDate(ev),
            createdAt: new Date(ev.createdAt).getTime(),
            seats: null,
            hasCert: ev.activities.some((a) => !!a.volunteerRole),
            href: hrefFor.event(ev.id),
        }
    })

    const fromStandalone = standalone
        .filter((a) => !a.eventId)
        .map((a): FeaturedCardItem => ({
            ...activityFilterFields(a),
            key: `activity-${a.id}`,
            imageUrl: a.imageUrl,
            description: a.description,
            href: hrefFor.activity(a.id),
        }))

    return [...fromEvents, ...fromStandalone]
}

/** กรองตามเงื่อนไขทั้งหมด แล้วเรียงตามตัวเลือกที่เลือกไว้ */
export function filterAndSortItems<T extends FilterableItem>(
    items: T[],
    filters: EventsFilterValues
): T[] {
    const q = filters.search.trim().toLowerCase()

    const list = items.filter((item) => {
        const matchesSearch = !q || item.searchText.includes(q)
        const matchesCategory =
            filters.categories.length === 0 || item.categories.some((c) => filters.categories.includes(c))
        const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(item.status)
        const matchesCert = !filters.certOnly || item.hasCert
        const matchesRange = withinRange(item.sortDate, filters.range)
        return matchesSearch && matchesCategory && matchesStatus && matchesCert && matchesRange
    })

    return [...list].sort((a, b) => {
        if (filters.sort === "latest") return b.sortDate - a.sortDate
        if (filters.sort === "newest") return b.createdAt - a.createdAt
        // ไม่จำกัดจำนวน = ที่นั่งว่างเยอะสุดเสมอ จึงดันขึ้นบนสุด
        if (filters.sort === "seats") {
            return (b.seats ?? Number.MAX_SAFE_INTEGER) - (a.seats ?? Number.MAX_SAFE_INTEGER)
        }
        if (filters.sort === "name") return a.name.localeCompare(b.name, "th")
        return a.sortDate - b.sortDate
    })
}

/**
 * จัดกลุ่มตามหมวดหมู่ตามลำดับใน CATEGORIES แล้วตัดกลุ่มที่ว่างทิ้ง
 *
 * การ์ดที่มีหลายหมวด (เช่นงานที่มีกิจกรรมย่อยคนละหมวด) จะไปโผล่ซ้ำในทุกหมวดที่ตรง
 * ไม่ใช่หมวดเดียว — ตั้งใจให้ซ้ำ เพราะผู้ใช้ที่กรองดูเฉพาะหมวด "วิชาการ" ก็ควรเห็นงานนี้เหมือนกัน
 */
export function groupByCategory<T extends FilterableItem>(items: T[]) {
    return CATEGORIES.map((category) => ({
        category,
        items: items.filter((item) => item.categories.includes(category.value)),
    })).filter((group) => group.items.length > 0)
}
