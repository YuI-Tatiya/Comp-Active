"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { ActivityCardSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { SectionHeading } from "@/components/ui/section-heading"
import { StatTile } from "@/components/ui/stat-tile"
import { FilterBar, type FilterSpec } from "@/components/ui/filter-bar"
import { EventCard, EventCardBadge } from "@/components/ui/event-card"
import { EVENT_CARD_GRID } from "@/components/ui/event-card-layout"
import { activitiesAPI, eventsAPI, isCancelledByOrganizer, Activity, EventSummary, OrganizerStats } from "@/lib/api"
import { CATEGORIES, categoriesBadgeLabel } from "@/lib/categories"
import { RANGE_OPTIONS, withinRange } from "@/lib/events-filter"
import { useAuth } from "@/lib/auth-context"
import {
  ArrowRight,
  CalendarDays,
  CalendarCheck,
  CalendarPlus,
  Users,
  Clock,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"

/** งานที่มีกิจกรรมย่อยหลายตัวจะรวมเป็นการ์ดเดียว — กดเข้าไปค่อยเจอกิจกรรมย่อยแต่ละตัว (เหมือนฝั่งนักศึกษา) */
function nearestUpcomingActivity(ev: EventSummary) {
  return [...ev.activities].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
}

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

/** การ์ดข้อมูลรวมที่ใช้แสดงผล — งาน (หลายกิจกรรมย่อย) และกิจกรรมเดี่ยว normalize มาเป็นรูปแบบเดียวกัน */
interface CardItem {
  key: string
  name: string
  imageUrl?: string | null
  description?: string | null
  categories: string[]
  status: "open" | "closed" | "cancelled"
  // กิจกรรมเดี่ยวไม่มีแนวคิดการเผยแพร่ระดับงาน — undefined = ไม่ใช้กรองด้วยเงื่อนไขนี้
  isPublic?: boolean
  hasCert: boolean
  href: string
  searchText: string
  sortDate: number
  createdAtMs: number
  registeredCount: number
}

const FILTERS: FilterSpec[] = [
  {
    key: "status",
    label: "สถานะ",
    options: [
      { value: "", label: "ทั้งหมด" },
      { value: "open", label: "เปิดรับสมัคร" },
      { value: "closed", label: "ปิดแล้ว" },
      { value: "cancelled", label: "ยกเลิก" },
    ],
  },
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
    const fromEvents = events.map((ev): CardItem => {
      const fa = nearestUpcomingActivity(ev)
      return {
        key: `event-${ev.id}`,
        name: ev.name,
        imageUrl: ev.imageUrl ?? fa?.imageUrl,
        description: ev.description,
        categories: eventCategories(ev),
        status: eventStatus(ev),
        isPublic: ev.isPublic,
        hasCert: eventHasCert(ev),
        href: `/organizer/events/view/${ev.id}`,
        searchText: [ev.name, ...ev.activities.map((a) => a.name)].join(" ").toLowerCase(),
        sortDate: earliestDate(ev),
        createdAtMs: new Date(ev.createdAt).getTime(),
        registeredCount: eventRegisteredCount(ev),
      }
    })

    const fromStandalone = standaloneActivities.map((a): CardItem => ({
      key: `activity-${a.id}`,
      name: a.name,
      imageUrl: a.imageUrl,
      description: a.description,
      categories: a.categories,
      status: isCancelledByOrganizer(a.approvalStatus) ? "cancelled" : a.status === "open" ? "open" : "closed",
      // กิจกรรมเดี่ยวไม่มีแนวคิดการเผยแพร่ระดับงาน — เว้นว่างไว้ ตัวกรอง "การเผยแพร่" จะไม่จับคู่กิจกรรมนี้เลย
      isPublic: undefined,
      hasCert: !!a.volunteerRole,
      href: `/organizer/activities/view/${a.id}`,
      searchText: a.name.toLowerCase(),
      sortDate: +new Date(a.date),
      // Activity ไม่มี createdAt — ใช้วันจัดกิจกรรมแทน ยังอยู่ในสเกลเดียวกับ createdAt ของ Event
      createdAtMs: +new Date(a.date),
      registeredCount: a.registeredCount ?? 0,
    }))

    return [...fromEvents, ...fromStandalone]
  }, [events, standaloneActivities])

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

  return (
    <>
      {/* ── แถบทักทาย ────────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-surface">
        <Container className="py-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-fg">
              สวัสดี {user?.name || "ผู้จัดกิจกรรม"}
            </h1>
            <p className="mt-1 text-sm text-fg-muted">
              {loading
                ? "กำลังโหลดข้อมูลของคุณ..."
                : `คุณมี ${stats?.totalActivities ?? myActivities.length} กิจกรรมในระบบ`}
            </p>
          </div>
        </Container>
      </section>

      {/* ── สถิติ ───────────────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <Container className="py-8">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="กิจกรรมทั้งหมด"
              value={loading ? "—" : (stats?.totalActivities ?? 0)}
              icon={CalendarDays}
            />
            <StatTile
              label="กำลังเปิดรับ"
              value={loading ? "—" : (stats?.activeActivities ?? 0)}
              icon={CalendarCheck}
            />
            <StatTile
              label="นักศึกษาทั้งหมด"
              value={loading ? "—" : (stats?.totalStudents ?? 0).toLocaleString("th-TH")}
              icon={Users}
            />
            <StatTile
              label="รออนุมัติ"
              value={loading ? "—" : pendingRegistrationsCount}
              icon={Clock}
              className={cn(
                !loading && pendingRegistrationsCount > 0 && "border-warning/30 bg-warning-bg"
              )}
            />
          </div>
        </Container>
      </section>

      {/* ── กิจกรรมทั้งหมดในระบบ ────────────────────────────────────────── */}
      <section>
        <Container className="py-10">
          <div>
            <SectionHeading
              title="กิจกรรมทั้งหมด"
              description={loading ? undefined : `${allItems.length} รายการ`}
              action={
                <Button variant="link" asChild className="px-0">
                  <Link href="/organizer/manage">
                    จัดการกิจกรรมของฉัน
                    <ArrowRight />
                  </Link>
                </Button>
              }
            />

            <div className="mt-5">
              <FilterBar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="ค้นหาชื่อกิจกรรม..."
                filters={FILTERS}
                values={values}
                onFilterChange={setFilter}
                onReset={resetFilters}
                resultCount={loading ? undefined : filteredActivities.length}
                resultUnit="รายการ"
              />

              {loading ? (
                <div className={EVENT_CARD_GRID}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <ActivityCardSkeleton key={i} />
                  ))}
                </div>
              ) : filteredActivities.length > 0 ? (
                <div className={EVENT_CARD_GRID}>
                  {filteredActivities.map((item) => (
                    <Link key={item.key} href={item.href} className="block">
                      <EventCard
                        activity={{ name: item.name, imageUrl: item.imageUrl }}
                        description={item.description}
                        badgeLeft={<EventCardBadge variant="light">{categoriesBadgeLabel(item.categories)}</EventCardBadge>}
                        badgeRight={
                          <EventCardBadge className={item.status === "open" ? "bg-success/90" : "bg-fg-subtle/90"}>
                            {item.status === "open" ? "กำลังเปิด" : "ปิดรับสมัคร"}
                          </EventCardBadge>
                        }
                      />
                    </Link>
                  ))}
                </div>
              ) : allItems.length === 0 ? (
                <EmptyState
                  icon={CalendarPlus}
                  title="ยังไม่มีกิจกรรมในระบบ"
                  description="รอกิจกรรมใหม่เปิดรับสมัครเร็วๆ นี้ หรือเริ่มสร้างกิจกรรมของคุณเอง"
                  action={
                    <Button asChild>
                      <Link href="/organizer/create">สร้างกิจกรรมใหม่</Link>
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={Search}
                  title="ไม่พบกิจกรรมที่ค้นหา"
                  description="ลองใช้คำค้นหาอื่น หรือล้างตัวกรองเพื่อดูกิจกรรมทั้งหมด"
                  action={
                    <Button variant="outline" onClick={resetFilters}>
                      ล้างตัวกรอง
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
