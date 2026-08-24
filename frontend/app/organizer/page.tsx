"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { SectionHeading } from "@/components/ui/section-heading"
import { StatTile } from "@/components/ui/stat-tile"
import { FilterBar, type FilterSpec } from "@/components/ui/filter-bar"
import { EventCard, EventCardBadge } from "@/components/ui/event-card"
import { activitiesAPI, eventsAPI, Activity, EventSummary, OrganizerStats } from "@/lib/api"
import { CATEGORIES, categoryLabel } from "@/lib/categories"
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

function isEventOpen(ev: EventSummary): boolean {
  return ev.activities.some((a) => a.status === "open")
}

/** วันจัดกิจกรรมย่อยที่เร็วที่สุดของงาน — ใช้เรียงลำดับ "ใกล้จัดงาน" */
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
  category?: string
  status: "open" | "closed"
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
      { value: "closed", label: "ปิดรับสมัคร" },
    ],
  },
  {
    key: "category",
    label: "หมวดหมู่",
    options: [{ value: "", label: "ทุกหมวดหมู่" }, ...CATEGORIES.map((c) => ({ value: c.value, label: c.label }))],
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

const INITIAL_VALUES: Record<string, string> = { status: "", category: "", sort: "newest" }

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
        category: fa?.category,
        status: isEventOpen(ev) ? "open" : "closed",
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
      category: a.category,
      status: a.status === "open" ? "open" : "closed",
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
      const matchesCategory = !values.category || item.category === values.category
      return matchesSearch && matchesStatus && matchesCategory
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
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-[380px] w-full rounded-2xl" />
                  ))}
                </div>
              ) : filteredActivities.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {filteredActivities.map((item) => (
                    <Link key={item.key} href={item.href} className="block">
                      <EventCard
                        activity={{ name: item.name, imageUrl: item.imageUrl }}
                        description={item.description}
                        badgeLeft={<EventCardBadge variant="light">{categoryLabel(item.category)}</EventCardBadge>}
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
