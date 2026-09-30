"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { EventCard, EventCardBadge } from "@/components/ui/event-card"
import { EVENT_CARD_GRID } from "@/components/ui/event-card-layout"
import { ActivityCardSkeleton, Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { SectionHeading } from "@/components/ui/section-heading"
import { StatTile } from "@/components/ui/stat-tile"
import { SkillRadar, SkillScoreList } from "@/components/ui/skill-radar"
import { UpcomingItem, type UpcomingActivity } from "@/components/ui/upcoming-item"
import { NewsCarousel } from "@/components/ui/news-carousel"
import { categoriesBadgeLabel } from "@/lib/categories"
import {
  activitiesAPI,
  eventsAPI,
  registrationsAPI,
  evaluationsAPI,
  certificatesAPI,
  Activity,
  SkillsData,
} from "@/lib/api"
import { buildFeaturedCards, type FeaturedCardItem } from "@/lib/events-filter"
import { useAuth } from "@/lib/auth-context"
import { ArrowRight, CalendarCheck, CalendarX, Clock, Sparkles, Trophy, TrendingUp } from "lucide-react"

interface MyRegistration {
  id: number
  status: string
  activity: UpcomingActivity
}

const XP_PER_LEVEL = 5000

export default function StudentDashboardPage() {
  const { user } = useAuth()
  const [recommended, setRecommended] = useState<FeaturedCardItem[]>([])
  const [registrations, setRegistrations] = useState<MyRegistration[]>([])
  const [skills, setSkills] = useState<SkillsData | null>(null)
  const [totalVolunteerHours, setTotalVolunteerHours] = useState<number | null>(null)
  const [loadingActivities, setLoadingActivities] = useState(true)
  const [loadingMine, setLoadingMine] = useState(true)

  useEffect(() => {
    // งานหนึ่งงาน (มีกิจกรรมย่อยกี่ตัวก็ตาม) ต้องแสดงเป็นการ์ดเดียว จึงต้องดึงทั้ง Event และ
    // กิจกรรมเดี่ยวมารวมกัน ไม่ใช่ดึงแค่ activitiesAPI.getAll() ที่คืนกิจกรรมย่อยแยกเป็นรายตัว
    Promise.all([eventsAPI.getAllPublic(), activitiesAPI.getAll().catch(() => [] as Activity[])])
      .then(([events, standalone]) => {
        const all = buildFeaturedCards(
          Array.isArray(events) ? events : [],
          Array.isArray(standalone) ? standalone : [],
          { event: (id) => `/student/events/${id}`, activity: (id) => `/student/activities/${id}` }
        )
        setRecommended([...all].sort((a, b) => a.sortDate - b.sortDate).slice(0, 3))
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingActivities(false))
  }, [])

  useEffect(() => {
    Promise.allSettled([
      registrationsAPI.getMy(),
      evaluationsAPI.getMySkills(),
      certificatesAPI.getMy(),
    ])
      .then(([regRes, skillRes, certRes]) => {
        if (regRes.status === "fulfilled" && Array.isArray(regRes.value)) {
          setRegistrations(regRes.value as MyRegistration[])
        }
        if (skillRes.status === "fulfilled") setSkills(skillRes.value)
        if (certRes.status === "fulfilled" && Array.isArray(certRes.value)) {
          const hours = certRes.value.reduce((sum, c) => sum + (Number(c.volunteerHours) || 0), 0)
          setTotalVolunteerHours(hours)
        }
      })
      .finally(() => setLoadingMine(false))
  }, [])

  // กิจกรรมที่ยังไม่ถึงวันจัด เรียงจากใกล้สุด
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const upcoming = registrations
    .filter((r) => {
      if (r.status === "cancelled" || !r.activity?.date) return false
      const d = new Date(r.activity.date)
      return !Number.isNaN(d.getTime()) && d >= startOfToday
    })
    .sort((a, b) => +new Date(a.activity.date) - +new Date(b.activity.date))
    .slice(0, 3)

  const level = skills?.level ?? 1
  const points = skills?.points ?? 0
  const xpInLevel = points % XP_PER_LEVEL
  const xpPercent = (xpInLevel / XP_PER_LEVEL) * 100

  return (
    <>
      {/* ── แถบทักทาย ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-16 -top-24 size-72 animate-pulse rounded-full bg-cat-volunteer/30 blur-3xl [animation-duration:4s]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 right-10 size-64 animate-pulse rounded-full bg-cat-art/30 blur-3xl [animation-duration:6s]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-1/3 top-0 size-40 animate-pulse rounded-full bg-cat-tech/25 blur-3xl [animation-duration:5s]"
        />
        <Container className="relative z-10 py-8">
          <div className="max-w-2xl">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm">
              <Sparkles className="size-3.5 animate-pulse" aria-hidden="true" />
              {loadingMine ? "กำลังโหลดข้อมูล..." : `ระดับ ${level}`}
            </span>

            <h1 className="mb-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
              สวัสดี {user?.name || "นักศึกษา"}
            </h1>
            <p className="text-white/85">
              เลือกกิจกรรมที่สนใจ สะสมคะแนน Soft Skills และติดตามการเติบโตของคุณ
            </p>
          </div>
        </Container>
      </div>

      {/* ── สถิติของฉัน ───────────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <Container className="py-8">
          <h2 className="mb-5 text-lg font-semibold text-fg">สถิติของฉัน</h2>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="กิจกรรมที่เข้าร่วม"
              value={loadingMine ? "—" : (skills?.count ?? 0)}
              icon={CalendarCheck}
            />
            <StatTile
              label="คะแนนสะสม"
              value={loadingMine ? "—" : (skills?.totalScore ?? 0).toLocaleString("th-TH")}
              icon={TrendingUp}
            />
            <StatTile
              label="อันดับในระบบ"
              value={loadingMine || !skills ? "—" : `#${skills.rank}`}
              caption={loadingMine || !skills ? undefined : `จากนักศึกษาทั้งหมด ${skills.totalStudents} คน`}
              icon={Trophy}
            />
            <StatTile
              label="ชั่วโมงจิตอาสา"
              value={
                totalVolunteerHours === null
                  ? "—"
                  : `${totalVolunteerHours.toLocaleString("th-TH", { maximumFractionDigits: 2 })} ชม.`
              }
              icon={Clock}
            />
          </div>
        </Container>
      </section>

      {/* ── กำลังจะถึง + ทักษะ ───────────────────────────────────────────── */}
      <section>
        <Container className="grid gap-6 py-10 lg:grid-cols-3">
          {/* กำลังจะถึง */}
          <div className="lg:col-span-2">
            <SectionHeading
              title="กำลังจะถึง"
              description={
                loadingMine
                  ? undefined
                  : upcoming.length > 0
                    ? `${upcoming.length} กิจกรรมที่คุณลงทะเบียนไว้`
                    : undefined
              }
              action={
                <Button variant="link" asChild className="px-0">
                  <Link href="/student/my-registrations">
                    กิจกรรมของฉัน
                    <ArrowRight />
                  </Link>
                </Button>
              }
            />

            <div className="mt-5 space-y-3">
              {loadingMine ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))
              ) : upcoming.length > 0 ? (
                upcoming.map((r) => (
                  <UpcomingItem
                    key={r.id}
                    activity={r.activity}
                    status={r.status}
                    href={`/student/activities/${r.activity.id}`}
                  />
                ))
              ) : (
                <EmptyState
                  icon={CalendarX}
                  title="ยังไม่มีกิจกรรมที่จะถึง"
                  description="ลงทะเบียนกิจกรรมที่สนใจเพื่อเริ่มสะสมคะแนนทักษะ"
                  action={
                    <Button asChild>
                      <Link href="/student/events">ดูกิจกรรมทั้งหมด</Link>
                    </Button>
                  }
                />
              )}
            </div>
          </div>

          {/* ทักษะของคุณ */}
          <div className="rounded-xl border border-border bg-bg p-5 shadow-xs">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold text-fg">ทักษะของคุณ</h2>
              <Link
                href="/student/profile"
                className="text-sm text-brand-600 hover:underline"
              >
                ดูรายละเอียด
              </Link>
            </div>

            {loadingMine ? (
              <Skeleton className="mt-4 h-56 w-full rounded-lg" />
            ) : skills && skills.count > 0 ? (
              <>
                <SkillRadar average={skills.average} />
                <div className="mt-2 border-t border-border pt-4">
                  <SkillScoreList average={skills.average} />
                </div>

                {/* ความคืบหน้าระดับ */}
                <div className="mt-5 border-t border-border pt-4">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-fg">ระดับ {level}</span>
                    <span className="text-fg-muted tabular-nums">
                      {xpInLevel} / {XP_PER_LEVEL} XP
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-brand-600 transition-all"
                      style={{ width: `${xpPercent}%` }}
                    />
                  </div>
                </div>

                {skills.badges && skills.badges.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-4">
                    {skills.badges.slice(0, 5).map((b) => (
                      <span
                        key={b.name}
                        title={b.description}
                        className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-fg-muted"
                      >
                        <span aria-hidden="true">{b.icon}</span>
                        {b.name}
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-fg-muted">
                ยังไม่มีคะแนนทักษะ — เข้าร่วมกิจกรรมและรอผู้จัดประเมิน
                คะแนนจะแสดงที่นี่โดยอัตโนมัติ
              </p>
            )}
          </div>
        </Container>
      </section>

      {/* ── แนะนำสำหรับคุณ ───────────────────────────────────────────────── */}
      <section className="border-t border-border bg-surface">
        <Container className="py-12">
          <SectionHeading
            title="แนะนำสำหรับคุณ"
            description="กิจกรรมที่กำลังเปิดรับสมัคร"
            action={
              <Button variant="link" asChild className="px-0">
                <Link href="/student/events">
                  ดูทั้งหมด
                  <ArrowRight />
                </Link>
              </Button>
            }
          />

          <div className="mt-6">
            {loadingActivities ? (
              <div className={EVENT_CARD_GRID}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <ActivityCardSkeleton key={i} />
                ))}
              </div>
            ) : recommended.length > 0 ? (
              <div className={EVENT_CARD_GRID}>
                {recommended.map((item) => (
                  <Link key={item.key} href={item.href} className="block">
                    <EventCard
                      activity={{ name: item.name, imageUrl: item.imageUrl }}
                      description={item.description}
                      badgeLeft={item.categories.length > 0 && <EventCardBadge variant="light">{categoriesBadgeLabel(item.categories)}</EventCardBadge>}
                      badgeRight={
                        <EventCardBadge className={item.status === "open" ? "bg-success/90" : "bg-fg-subtle/90"}>
                          {item.status === "open" ? "กำลังเปิด" : "ปิดรับสมัคร"}
                        </EventCardBadge>
                      }
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState icon={CalendarX} title="ยังไม่มีกิจกรรมเปิดรับสมัคร" />
            )}
          </div>
        </Container>
      </section>

      {/* ── ข่าวสารและประกาศ ─────────────────────────────────────────────── */}
      <NewsCarousel />
    </>
  )
}
