"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Container } from "@/components/layout/container"
import type { FilterSpec } from "@/components/ui/filter-bar"
import { formatRegistrationWindow } from "@/components/ui/event-card"
import { OrganizerHero } from "@/components/organizer/home-hero"
import { ActivityCard, ResultLine, type ActivityCardData } from "@/components/organizer/home-activity-list"
import {
  ACTIVITY_GRID,
  ActivityCardSkeleton,
  CreateActivityTile,
  FilterPanel,
  OrganizerStatCards,
  StatusTabs,
  referenceCode,
  type OrganizerStat,
} from "@/components/denim/denim-ui"
import { activitiesAPI, eventsAPI, isCancelledByOrganizer, Activity, EventSummary, OrganizerStats } from "@/lib/api"
import { CATEGORIES } from "@/lib/categories"
import { formatCompactDateSpan } from "@/lib/date-span"
import { RANGE_OPTIONS, eventImagePath, withinRange } from "@/lib/events-filter"
import { useAuth } from "@/lib/auth-context"
import { ArrowRight, CalendarDays, Clock, Search, Users, Zap } from "lucide-react"

// งานที่มีกิจกรรมย่อยหลายตัวจะรวมเป็นการ์ดเดียว — กดเข้าไปค่อยเจอกิจกรรมย่อยแต่ละตัว (เหมือนฝั่งนักศึกษา)

function eventRegisteredCount(ev: EventSummary): number {
  return ev.activities.reduce((sum, a) => sum + (a.registeredCount ?? 0), 0)
}

/** สถานะรวมของงาน — ยกเลิกเมื่อกิจกรรมย่อยทุกตัวถูกยกเลิก, เปิดเมื่อมีอย่างน้อยหนึ่งตัวเปิดอยู่ */
function eventStatus(ev: EventSummary): "open" | "closed" | "cancelled" {
  const list = ev.activities
  if (list.length > 0 && list.every((a) => isCancelledByOrganizer(a.approvalStatus))) return "cancelled"
  return list.some((a) => a.status === "open") ? "open" : "closed"
}

/** งานมีใบรับรองจิตอาสาถ้ากิจกรรมย่อยตัวใดตัวหนึ่งออกใบรับรอง */
function eventHasCert(ev: EventSummary): boolean {
  return ev.activities.some((a) => !!a.volunteerRole)
}

/** หมวดหมู่ทั้งหมดที่กิจกรรมย่อยของงานนี้ระบุไว้ — ใช้กรองด้วยหมวดหมู่ให้ตรงทุกกิจกรรมย่อย ไม่ใช่แค่ตัวเดียว */
function eventCategories(ev: EventSummary): string[] {
  return Array.from(new Set(ev.activities.flatMap((a) => a.categories)))
}

/** วันจัดกิจกรรมย่อยที่เร็วที่สุดของงาน — ใช้เรียงลำดับ "ใกล้จัดงาน" และกรองช่วงเวลา */
function earliestDate(ev: EventSummary): number {
  const times = ev.activities.map((a) => new Date(a.date).getTime()).filter((t) => !Number.isNaN(t))
  return times.length ? Math.min(...times) : Number.POSITIVE_INFINITY
}

/** วันจัดกิจกรรมย่อยวันสุดท้ายของงาน — คู่กับ earliestDate ใช้แสดงช่วงวันที่บนการ์ด */
function latestDate(ev: EventSummary): number {
  const times = ev.activities.map((a) => new Date(a.date).getTime()).filter((t) => !Number.isNaN(t))
  return times.length ? Math.max(...times) : Number.NEGATIVE_INFINITY
}

/** การ์ดข้อมูลรวมที่ใช้แสดงผล — งาน (หลายกิจกรรมย่อย) และกิจกรรมเดี่ยว normalize มาเป็นรูปแบบเดียวกัน */
interface CardItem {
  key: string
  code: string
  /** ผู้จัดเจ้าของ — ใช้เลือกคำบนปุ่มการ์ด ("จัดการ" ของตัวเอง / "ดูรายละเอียด" ของคนอื่น) */
  ownerId?: number
  name: string
  description?: string | null
  categories: string[]
  status: "open" | "closed" | "cancelled"
  // กิจกรรมเดี่ยวไม่มีแนวคิดการเผยแพร่ระดับงาน — undefined = ไม่ใช้กรองด้วยเงื่อนไขนี้
  isPublic?: boolean
  /** path รูปที่ผู้จัดแนบ (eventImagePath) — null = ปกลายของธีม */
  imageUrl: string | null
  hasCert: boolean
  href: string
  searchText: string
  sortDate: number
  /** วันจัดกิจกรรมวันสุดท้าย (epoch ms) — ต่างจาก sortDate (วันแรก) เฉพาะงานที่มีกิจกรรมย่อยคนละวัน */
  endDate: number
  /** ช่วงเปิด-ปิดรับสมัคร — มีความหมายเฉพาะ Event เท่านั้น กิจกรรมเดี่ยวไม่มีฟิลด์นี้ในสคีมาเลยเป็น null เสมอ */
  registrationOpenAt: string | null
  registrationCloseAt: string | null
  createdAtMs: number
  registeredCount: number
}

/** สถานะแยกเป็นแท็บทรงแคปซูลต่างหาก (เหมือน /organizer/manage) ไม่ใช่ dropdown ในชุดตัวกรอง —
 *  ตัวกรองที่เหลือ 5 ตัวพอดีกับ auto-fill grid แถวเดียวที่ xl+ ถ้ายัด status เป็นตัวที่ 6 เข้าไปด้วย
 *  จะดันให้ grid ล้นไปอีกแถว แล้ว items-end จะดันช่องค้นหาลงไปเรียงกับแถวที่ล้นนั้นแทน ดูเหมือนหน้าตาพัง */
const STATUS_TABS: { value: string; label: string }[] = [
  { value: "", label: "ทั้งหมด" },
  { value: "open", label: "เปิดรับสมัคร" },
  { value: "closed", label: "ปิดแล้ว" },
  { value: "cancelled", label: "ยกเลิก" },
]

const FILTERS: FilterSpec[] = [
  {
    key: "visibility",
    label: "การเผยแพร่",
    options: [
      { value: "", label: "ทั้งหมด" },
      { value: "public", label: "เผยแพร่แล้ว" },
      { value: "private", label: "ไม่เผยแพร่" },
    ],
  },
  {
    key: "category",
    label: "หมวดหมู่",
    options: [{ value: "", label: "ทุกหมวดหมู่" }, ...CATEGORIES.map((c) => ({ value: c.value, label: c.label }))],
  },
  {
    key: "cert",
    label: "ใบรับรอง",
    options: [
      { value: "", label: "ทั้งหมด" },
      { value: "yes", label: "มีใบรับรองจิตอาสา" },
      { value: "no", label: "ไม่มีใบรับรองจิตอาสา" },
    ],
  },
  {
    key: "range",
    label: "ช่วงเวลาจัดงาน",
    options: RANGE_OPTIONS,
  },
  {
    key: "sort",
    label: "เรียงลำดับ",
    neutralValue: "newest",
    options: [
      { value: "newest", label: "สร้างล่าสุด" },
      { value: "soon", label: "ใกล้จัดงาน" },
      { value: "registrations", label: "ยอดลงทะเบียนสูงสุด" },
    ],
  },
]

const INITIAL_VALUES: Record<string, string> = {
  status: "",
  visibility: "",
  category: "",
  cert: "",
  range: "",
  sort: "newest",
}

export default function OrganizerDashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<OrganizerStats | null>(null)
  const [myActivities, setMyActivities] = useState<Activity[]>([])
  // งานและกิจกรรมเดี่ยวทั้งหมดในระบบ (ทุกผู้จัด) — ใช้ feed สาธารณะเดียวกับหน้า /events และ /student/events
  const [events, setEvents] = useState<EventSummary[]>([])
  const [standaloneActivities, setStandaloneActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [values, setValues] = useState<Record<string, string>>(INITIAL_VALUES)

  useEffect(() => {
    Promise.allSettled([
      activitiesAPI.getOrganizerStats(),
      activitiesAPI.getMy(),
      eventsAPI.getAllPublic(),
      activitiesAPI.getAll(),
    ])
      .then(([statsRes, listRes, eventsRes, allRes]) => {
        if (statsRes.status === "fulfilled") setStats(statsRes.value)
        if (listRes.status === "fulfilled" && Array.isArray(listRes.value)) {
          setMyActivities(listRes.value as Activity[])
        }
        if (eventsRes.status === "fulfilled" && Array.isArray(eventsRes.value)) {
          setEvents(eventsRes.value as EventSummary[])
        }
        if (allRes.status === "fulfilled" && Array.isArray(allRes.value)) {
          // กิจกรรมเดี่ยว (ไม่ผูกกับงาน) เท่านั้น — ที่ผูกกับงานแสดงรวมในการ์ดของงานแล้ว
          setStandaloneActivities((allRes.value as Activity[]).filter((a) => !a.eventId))
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const pendingRegistrationsCount = stats?.pendingRegistrations ?? 0

  function setFilter(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function resetFilters() {
    setSearchQuery("")
    setValues(INITIAL_VALUES)
  }

  const allItems = useMemo<CardItem[]>(() => {
    const fromEvents = events.map((ev): CardItem => ({
      key: `event-${ev.id}`,
      code: referenceCode("EVT", ev.id),
      ownerId: ev.organizerId,
      name: ev.name,
      description: ev.description,
      categories: eventCategories(ev),
      status: eventStatus(ev),
      isPublic: ev.isPublic,
      imageUrl: eventImagePath(ev),
      hasCert: eventHasCert(ev),
      href: `/organizer/events/view/${ev.id}`,
      searchText: [ev.name, ...ev.activities.map((a) => a.name)].join(" ").toLowerCase(),
      sortDate: earliestDate(ev),
      endDate: latestDate(ev),
      createdAtMs: new Date(ev.createdAt).getTime(),
      registeredCount: eventRegisteredCount(ev),
      registrationOpenAt: ev.registrationOpenAt ?? null,
      registrationCloseAt: ev.registrationCloseAt ?? null,
    }))

    const fromStandalone = standaloneActivities.map((a): CardItem => ({
      key: `activity-${a.id}`,
      code: referenceCode("ACT", a.id),
      ownerId: a.organizer?.id,
      name: a.name,
      description: a.description,
      categories: a.categories,
      status: isCancelledByOrganizer(a.approvalStatus) ? "cancelled" : a.status === "open" ? "open" : "closed",
      // กิจกรรมเดี่ยวไม่มีแนวคิดการเผยแพร่ระดับงาน — เว้นว่างไว้ ตัวกรอง "การเผยแพร่" จะไม่จับคู่กิจกรรมนี้เลย
      isPublic: undefined,
      imageUrl: a.imageUrl || null,
      hasCert: !!a.volunteerRole,
      href: `/organizer/activities/view/${a.id}`,
      searchText: a.name.toLowerCase(),
      sortDate: +new Date(a.date),
      // กิจกรรมเดี่ยว = วันเดียว (endDate เท่ากับ sortDate) และไม่มีช่วงรับสมัครในสคีมา
      endDate: +new Date(a.date),
      registrationOpenAt: null,
      registrationCloseAt: null,
      // Activity ไม่มี createdAt — ใช้วันจัดกิจกรรมแทน ยังอยู่ในสเกลเดียวกับ createdAt ของ Event
      createdAtMs: +new Date(a.date),
      registeredCount: a.registeredCount ?? 0,
    }))

    return [...fromEvents, ...fromStandalone]
  }, [events, standaloneActivities])

  /** จำนวนรายการต่อแท็บสถานะ — นับจาก allItems ดิบ (ไม่ผ่านตัวกรองอื่น/คำค้นหา) ให้ตัวเลขนิ่งเหมือน /organizer/manage */
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { "": allItems.length, open: 0, closed: 0, cancelled: 0 }
    for (const item of allItems) counts[item.status]++
    return counts
  }, [allItems])

  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const list = allItems.filter((item) => {
      const matchesSearch = !q || item.searchText.includes(q)
      const matchesStatus = !values.status || item.status === values.status
      const matchesVisibility =
        !values.visibility || (item.isPublic === undefined ? false : values.visibility === "public" ? item.isPublic : !item.isPublic)
      const matchesCategory = !values.category || item.categories.includes(values.category)
      const matchesCert = !values.cert || (values.cert === "yes" ? item.hasCert : !item.hasCert)
      const matchesRange = withinRange(item.sortDate, values.range)
      return matchesSearch && matchesStatus && matchesVisibility && matchesCategory && matchesCert && matchesRange
    })

    return [...list].sort((a, b) => {
      if (values.sort === "soon") return a.sortDate - b.sortDate
      if (values.sort === "registrations") return b.registeredCount - a.registeredCount
      return b.createdAtMs - a.createdAtMs
    })
  }, [allItems, searchQuery, values])

  const activeFilterCount =
    FILTERS.filter((f) => (values[f.key] ?? f.neutralValue ?? "") !== (f.neutralValue ?? "")).length +
    (searchQuery.trim() ? 1 : 0)

  const totalActivities = stats?.totalActivities ?? myActivities.length
  const openActivities = stats?.activeActivities ?? 0
  const summary = loading
    ? "กำลังโหลดข้อมูลของคุณ..."
    : totalActivities === 0
      ? "คุณยังไม่มีกิจกรรมในระบบ — เริ่มสร้างกิจกรรมแรกให้เพื่อน ๆ เด็กคอมได้เลย"
      : openActivities > 0
        ? `คุณมี ${totalActivities} กิจกรรมในระบบ และ ${openActivities} กิจกรรมกำลังเปิดรับสมัคร — ชวนเพื่อน ๆ เด็กคอมมาสะสมชั่วโมงกิจกรรมกันต่อ`
        : `คุณมี ${totalActivities} กิจกรรมในระบบ ยังไม่มีกิจกรรมที่เปิดรับสมัครอยู่ — ปล่อยกิจกรรมใหม่ให้เพื่อน ๆ เด็กคอมกันต่อ`

  const heroStats: OrganizerStat[] = [
    { code: "ALL_EVENTS", label: "กิจกรรมทั้งหมด", value: loading ? "—" : totalActivities, icon: CalendarDays },
    { code: "OPEN_NOW", label: "กำลังเปิดรับสมัคร", value: loading ? "—" : openActivities, icon: Zap, highlight: true },
    {
      code: "STUDENTS",
      label: "นักศึกษาทั้งหมด",
      value: loading ? "—" : (stats?.totalStudents ?? 0).toLocaleString("th-TH"),
      icon: Users,
    },
    {
      code: "PENDING",
      label: loading
        ? "รออนุมัติ"
        : pendingRegistrationsCount > 0
          ? "รออนุมัติ · รอคุณยืนยัน"
          : "รออนุมัติ · เคลียร์หมดแล้ว",
      value: loading ? "—" : pendingRegistrationsCount,
      icon: Clock,
      attention: !loading && pendingRegistrationsCount > 0,
    },
  ]

  function toCardData(item: CardItem): ActivityCardData {
    return {
      href: item.href,
      name: item.name,
      description: item.description,
      categories: item.categories,
      status: item.status,
      code: item.code,
      dateMs: item.sortDate,
      dateLabel: formatCompactDateSpan(item.sortDate, item.endDate),
      registrationWindow: formatRegistrationWindow(item.registrationOpenAt, item.registrationCloseAt, { compact: true }),
      actionLabel: item.ownerId !== undefined && item.ownerId === user?.id ? "จัดการ" : "ดูรายละเอียด",
      unpublished: item.isPublic === false,
      imageUrl: item.imageUrl,
    }
  }

  return (
    <div className="bg-denim-paper font-plex text-denim-deep">
      <OrganizerHero name={user?.name || "ผู้จัดกิจกรรม"} summary={summary} />
      <OrganizerStatCards stats={heroStats} />

      {/* ── กิจกรรมทั้งหมดในระบบ ────────────────────────────────────────── */}
      <section aria-labelledby="organizer-activities-heading">
        <Container className="flex flex-col gap-6 pb-[88px] pt-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="font-code text-[13px] text-denim-accent" aria-hidden="true">
                {"// activities.list()"}
              </span>
              <h2
                id="organizer-activities-heading"
                className="font-display text-[34px] font-bold leading-tight text-denim-deep"
              >
                กิจกรรมทั้งหมด
              </h2>
            </div>
            <Link
              href="/organizer/manage"
              className="inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-denim transition-colors hover:text-denim-deep"
            >
              จัดการกิจกรรมของฉัน
              <ArrowRight className="size-[18px]" aria-hidden="true" />
            </Link>
          </div>

          {/* แท็บสถานะแยกจากแผงตัวกรอง (เหมือน /organizer/manage) — ตัวเลขนับจากรายการทั้งหมด ไม่ผ่านตัวกรองอื่น */}
          <StatusTabs
            tabs={STATUS_TABS}
            value={values.status}
            counts={statusCounts}
            onChange={(value) => setFilter("status", value)}
          />

          <FilterPanel
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="ค้นหาชื่อกิจกรรม..."
            filters={FILTERS}
            values={values}
            onFilterChange={setFilter}
          />

          <ResultLine
            count={loading ? undefined : filteredActivities.length}
            activeFilters={activeFilterCount}
            onReset={resetFilters}
          />

          {loading ? (
            <div className={ACTIVITY_GRID}>
              {Array.from({ length: 3 }).map((_, i) => (
                <ActivityCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredActivities.length > 0 || allItems.length === 0 ? (
            // ยังไม่มีกิจกรรมในระบบเลย = เหลือแค่ช่องสร้างกิจกรรมใหม่ในกริด (ทำหน้าที่เป็น empty state ในตัว)
            <div className={ACTIVITY_GRID}>
              {filteredActivities.map((item) => (
                <ActivityCard key={item.key} item={toCardData(item)} />
              ))}
              <CreateActivityTile />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[22px] border-2 border-dashed border-denim-dash bg-white px-6 py-16 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-denim-chip">
                <Search className="size-6 text-denim" aria-hidden="true" />
              </span>
              <h3 className="font-display text-lg font-bold text-denim-deep">ไม่พบกิจกรรมที่ค้นหา</h3>
              <p className="max-w-sm text-sm text-denim-muted">
                ลองใช้คำค้นหาอื่น หรือล้างตัวกรองเพื่อดูกิจกรรมทั้งหมด
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-2 inline-flex min-h-11 items-center rounded-xl border-[1.5px] border-denim px-5 text-sm font-semibold text-denim transition-colors hover:bg-denim hover:text-white"
              >
                ล้างตัวกรอง
              </button>
            </div>
          )}
        </Container>
      </section>
    </div>
  )
}
