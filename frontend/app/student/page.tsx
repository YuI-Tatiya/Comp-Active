"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/ui/page-header"
import { EventCard, EventCardBadge } from "@/components/ui/event-card"
import { EVENT_CARD_GRID, EVENT_CARD_SECTION_WIDTH } from "@/components/ui/event-card-layout"
import { cn } from "@/lib/utils"
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
import { ArrowRight, CalendarCheck, CalendarX, Clock, Trophy, TrendingUp, Star } from "lucide-react"

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
      <PageHeader
        badge={loadingMine ? "กำลังโหลดข้อมูล..." : `ระดับ ${level}`}
        title={`สวัสดี ${user?.name || "นักศึกษา"}`}
        subtitle="เลือกกิจกรรมที่สนใจ สะสมคะแนน Soft Skills และติดตามการเติบโตของคุณ"
        icons={[Trophy, Star, CalendarCheck]}
      />

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

      {/* ── กำลังจะถึง + ระดับของคุณ ─────────────────────────────────────── */}
      <section>
        <Container className="grid gap-6 pt-10 lg:grid-cols-5">
          {/* กำลังจะถึง */}
          <div className="lg:col-span-3">
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

          {/* ระดับของคุณ */}
          <div className="flex flex-col rounded-xl border border-border bg-bg p-5 shadow-xs sm:p-6 lg:col-span-2">
            <h2 className="text-base font-semibold text-fg">ระดับของคุณ</h2>

            {loadingMine ? (
              <Skeleton className="mt-4 h-44 w-full rounded-lg" />
            ) : (
              <>
                <div className="mt-4 flex items-center gap-4">
                  <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 text-2xl font-bold text-white shadow-md shadow-brand-600/25">
                    {level}
                  </span>
                  <div>
                    <p className="text-sm text-fg-muted">ระดับปัจจุบัน</p>
                    <p className="text-xl font-semibold text-fg tabular-nums">
                      {points.toLocaleString("th-TH")}{" "}
                      <span className="text-sm font-normal text-fg-muted">XP</span>
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs text-fg-muted">
                    <span>สู่ระดับ {level + 1}</span>
                    <span className="tabular-nums">
                      {xpInLevel.toLocaleString("th-TH")} / {XP_PER_LEVEL.toLocaleString("th-TH")} XP
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-500 transition-all"
                      style={{ width: `${xpPercent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-fg-subtle">
                    อีก {(XP_PER_LEVEL - xpInLevel).toLocaleString("th-TH")} XP ถึงระดับ {level + 1}
                  </p>
                </div>
              </>
            )}
          </div>
        </Container>
      </section>

      {/* ── ทักษะของคุณ ──────────────────────────────────────────────────── */}
      <section>
        <Container className="pb-10 pt-6">
          <div className="rounded-xl border border-border bg-bg p-5 shadow-xs sm:p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold text-fg">ทักษะของคุณ</h2>
              <Link href="/student/profile" className="text-sm text-brand-600 hover:underline">
                ดูรายละเอียด
              </Link>
            </div>

            {loadingMine ? (
              <Skeleton className="mt-4 h-56 w-full rounded-lg" />
            ) : skills && skills.count > 0 ? (
              <div className="mt-4 grid items-center gap-6 lg:grid-cols-2 lg:gap-10">
                <SkillRadar average={skills.average} height={360} />
                <SkillScoreList average={skills.average} columns={2} />
              </div>
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
        <Container className={cn("py-12", EVENT_CARD_SECTION_WIDTH)}>
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
