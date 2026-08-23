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
import {
  EventCard,
  EventCardBadge,
  EventCardProgress,
  EventCardRow,
  formatEventDate,
} from "@/components/ui/event-card"
import { activitiesAPI, Activity, OrganizerStats } from "@/lib/api"
import { CATEGORIES, categoryLabel } from "@/lib/categories"
import { useAuth } from "@/lib/auth-context"
import {
  ArrowRight,
  CalendarDays,
  CalendarCheck,
  CalendarPlus,
  Users,
  Clock,
  Calendar,
  MapPin,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"

const STATUS_META: Record<string, { label: string; className: string }> = {
  open: { label: "เปิดรับสมัคร", className: "bg-success/90" },
  closed: { label: "ปิดรับสมัคร", className: "bg-fg-subtle/90" },
  completed: { label: "จบแล้ว", className: "bg-info/90" },
}

const FILTERS: FilterSpec[] = [
  {
    key: "status",
    label: "สถานะ",
    options: [
      { value: "", label: "ทั้งหมด" },
      { value: "open", label: "เปิดรับสมัคร" },
      { value: "closed", label: "ปิดรับสมัคร" },
      { value: "completed", label: "จบแล้ว" },
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
  // กิจกรรมทั้งหมดในระบบ (ทุกผู้จัด) — ใช้ feed สาธารณะเดียวกับหน้า /events
  const [allActivities, setAllActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [values, setValues] = useState<Record<string, string>>(INITIAL_VALUES)

  useEffect(() => {
    Promise.allSettled([
      activitiesAPI.getOrganizerStats(),
      activitiesAPI.getMy(),
      activitiesAPI.getAll(),
    ])
      .then(([statsRes, listRes, allRes]) => {
        if (statsRes.status === "fulfilled") setStats(statsRes.value)
        if (listRes.status === "fulfilled" && Array.isArray(listRes.value)) {
          setMyActivities(listRes.value as Activity[])
        }
        if (allRes.status === "fulfilled" && Array.isArray(allRes.value)) {
          setAllActivities(allRes.value as Activity[])
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const pending = myActivities.filter((a) => a.approvalStatus === "pending_approval")
  const pendingCount = stats?.pendingApprovals ?? pending.length

  function setFilter(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function resetFilters() {
    setSearchQuery("")
    setValues(INITIAL_VALUES)
  }

  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const list = allActivities.filter((a) => {
      const matchesSearch = !q || a.name.toLowerCase().includes(q)
      const matchesStatus = !values.status || a.status === values.status
      const matchesCategory = !values.category || a.category === values.category
      return matchesSearch && matchesStatus && matchesCategory
    })

    return [...list].sort((a, b) => {
      if (values.sort === "soon") return +new Date(a.date) - +new Date(b.date)
      if (values.sort === "registrations") return (b.registeredCount ?? 0) - (a.registeredCount ?? 0)
      // Activity ไม่มี createdAt — ใช้ id (auto-increment) แทนลำดับการสร้าง
      return b.id - a.id
    })
  }, [allActivities, searchQuery, values])

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
              value={loading ? "—" : pendingCount}
              icon={Clock}
              className={cn(
                !loading && pendingCount > 0 && "border-warning/30 bg-warning-bg"
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
              description={loading ? undefined : `${allActivities.length} รายการ`}
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
                  {filteredActivities.map((a) => {
                    const status = STATUS_META[a.status] ?? STATUS_META.open
                    return (
                      <EventCard
                        key={a.id}
                        activity={a}
                        badgeLeft={<EventCardBadge variant="light">{categoryLabel(a.category)}</EventCardBadge>}
                        badgeRight={<EventCardBadge className={status.className}>{status.label}</EventCardBadge>}
                        actions={
                          <Link href={`/events/${a.id}`} className="flex-1">
                            <Button className="h-11 w-full rounded-xl font-bold shadow-md shadow-brand-500/20">
                              ดูรายละเอียด
                            </Button>
                          </Link>
                        }
                      >
                        <EventCardRow icon={Calendar} tone="brand">
                          {formatEventDate(a.date)}
                        </EventCardRow>
                        <EventCardRow icon={MapPin} tone="danger">
                          <span className="truncate">{a.location}</span>
                        </EventCardRow>
                        <EventCardProgress registered={a.registeredCount ?? 0} capacity={a.capacity} />
                      </EventCard>
                    )
                  })}
                </div>
              ) : allActivities.length === 0 ? (
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
