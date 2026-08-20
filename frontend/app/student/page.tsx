"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { ActivityCard } from "@/components/ui/activity-card"
import { ActivityCardSkeleton, Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { SectionHeading } from "@/components/ui/section-heading"
import { StatTile } from "@/components/ui/stat-tile"
import { SkillRadar, SkillScoreList } from "@/components/ui/skill-radar"
import { UpcomingItem, type UpcomingActivity } from "@/components/ui/upcoming-item"
import { NewsCarousel } from "@/components/ui/news-carousel"
import {
  activitiesAPI,
  registrationsAPI,
  evaluationsAPI,
  certificatesAPI,
  Activity,
  SkillsData,
} from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { ArrowRight, CalendarCheck, CalendarX, Award, Sparkles, TrendingUp } from "lucide-react"

interface MyRegistration {
  id: number
  status: string
  activity: UpcomingActivity
}

const XP_PER_LEVEL = 5000

export default function StudentDashboardPage() {
  const { user } = useAuth()
  const [recommended, setRecommended] = useState<Activity[]>([])
  const [registrations, setRegistrations] = useState<MyRegistration[]>([])
  const [skills, setSkills] = useState<SkillsData | null>(null)
  const [certCount, setCertCount] = useState<number | null>(null)
  const [loadingActivities, setLoadingActivities] = useState(true)
  const [loadingMine, setLoadingMine] = useState(true)

  useEffect(() => {
    activitiesAPI
      .getAll()
      .then((data) => setRecommended(Array.isArray(data) ? data.slice(0, 3) : []))
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
          setCertCount(certRes.value.length)
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
      <section className="border-b border-border bg-surface">
        <Container className="py-12 sm:py-16">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg px-3 py-1 text-xs font-medium text-fg-muted">
              <Sparkles className="size-3.5 text-brand-600" aria-hidden="true" />
              {loadingMine ? "กำลังโหลดข้อมูล..." : `ระดับ ${level}`}
            </span>

            <h1 className="mt-5 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
              สวัสดี {user?.name || "นักศึกษา"}
            </h1>
            <p className="mt-3 text-base leading-relaxed text-fg-muted">
              เลือกกิจกรรมที่สนใจ สะสมคะแนน Soft Skills และติดตามการเติบโตของคุณ
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/student/events">
                  ค้นหากิจกรรม
                  <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/student/profile">ทักษะของฉัน</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* ── ข่าวสารและประกาศ ─────────────────────────────────────────────── */}
      <NewsCarousel />

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
              value={loadingMine ? "—" : points.toLocaleString("th-TH")}
              icon={TrendingUp}
            />
            <StatTile
              label="ระดับปัจจุบัน"
              value={loadingMine ? "—" : `LV ${level}`}
              icon={Sparkles}
            />
            <StatTile
              label="เกียรติบัตร"
              value={certCount === null ? "—" : certCount}
              icon={Award}
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
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <ActivityCardSkeleton key={i} />
                ))}
              </div>
            ) : recommended.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {recommended.map((ev) => (
                  <ActivityCard
                    key={ev.id}
                    activity={ev}
                    href={`/student/activities/${ev.id}`}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={CalendarX} title="ยังไม่มีกิจกรรมเปิดรับสมัคร" />
            )}
          </div>
        </Container>
      </section>
    </>
  )
}
