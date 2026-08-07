"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { SectionHeading } from "@/components/ui/section-heading"
import { StatTile } from "@/components/ui/stat-tile"
import { ActivityRow } from "@/components/ui/activity-row"
import { activitiesAPI, Activity, OrganizerStats } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import {
  ArrowRight,
  CalendarDays,
  CalendarCheck,
  CalendarPlus,
  Users,
  Clock,
  Plus,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function OrganizerDashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<OrganizerStats | null>(null)
  const [myActivities, setMyActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([activitiesAPI.getOrganizerStats(), activitiesAPI.getMy()])
      .then(([statsRes, listRes]) => {
        if (statsRes.status === "fulfilled") setStats(statsRes.value)
        if (listRes.status === "fulfilled" && Array.isArray(listRes.value)) {
          setMyActivities(listRes.value as Activity[])
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const pending = myActivities.filter((a) => a.approvalStatus === "pending_approval")
  const completed = myActivities.filter((a) => a.status === "completed")

  // เรียงกิจกรรมของฉันตามวันที่ใกล้ที่สุดก่อน
  const recent = [...myActivities]
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 5)

  const pendingCount = stats?.pendingApprovals ?? pending.length

  return (
    <>
      {/* ── แถบทักทาย ────────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-surface">
        <Container className="flex flex-col gap-3 py-8 sm:flex-row sm:items-center sm:justify-between">
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
          <Button asChild>
            <Link href="/organizer/create">
              <Plus />
              สร้างกิจกรรม
            </Link>
          </Button>
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
              label="ผู้สมัครรวม"
              value={loading ? "—" : (stats?.totalRegistrations ?? 0).toLocaleString("th-TH")}
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

      {/* ── กิจกรรมของฉัน + ต้องดำเนินการ ────────────────────────────────── */}
      <section>
        <Container className="grid gap-6 py-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionHeading
              title="กิจกรรมของฉัน"
              description={loading ? undefined : `${myActivities.length} รายการ`}
              action={
                <Button variant="link" asChild className="px-0">
                  <Link href="/organizer/manage">
                    จัดการทั้งหมด
                    <ArrowRight />
                  </Link>
                </Button>
              }
            />

            <div className="mt-5 space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[76px] w-full rounded-lg" />
                ))
              ) : recent.length > 0 ? (
                recent.map((a) => (
                  <ActivityRow
                    key={a.id}
                    activity={a}
                    href={`/organizer/events/${a.id}`}
                  />
                ))
              ) : (
                <EmptyState
                  icon={CalendarPlus}
                  title="ยังไม่มีกิจกรรม"
                  description="เริ่มสร้างกิจกรรมแรกของคุณเพื่อเปิดรับสมัครนักศึกษา"
                  action={
                    <Button asChild>
                      <Link href="/organizer/create">
                        <Plus />
                        สร้างกิจกรรม
                      </Link>
                    </Button>
                  }
                />
              )}
            </div>
          </div>

          {/* ต้องดำเนินการ */}
          <div className="rounded-xl border border-border bg-bg p-5 shadow-xs">
            <h2 className="text-base font-semibold text-fg">ต้องดำเนินการ</h2>

            {loading ? (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            ) : pendingCount === 0 && completed.length === 0 ? (
              <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-success-bg p-3">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                <p className="text-sm text-fg-muted">ไม่มีรายการค้าง ทุกอย่างเรียบร้อย</p>
              </div>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {pendingCount > 0 && (
                  <li>
                    <Link
                      href="/organizer/manage"
                      className="flex items-start gap-2.5 rounded-lg bg-warning-bg p-3 transition-opacity hover:opacity-80"
                    >
                      <Clock className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium text-fg">
                          {pendingCount} กิจกรรมรออนุมัติ
                        </p>
                        <p className="mt-0.5 text-xs text-fg-muted">
                          รอผู้ดูแลระบบตรวจสอบก่อนเผยแพร่
                        </p>
                      </div>
                    </Link>
                  </li>
                )}
                {completed.length > 0 && (
                  <li>
                    <Link
                      href="/organizer/manage"
                      className="flex items-start gap-2.5 rounded-lg bg-surface p-3 transition-colors hover:bg-surface-2"
                    >
                      <CalendarCheck
                        className="mt-0.5 size-4 shrink-0 text-fg-subtle"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-sm font-medium text-fg">
                          {completed.length} กิจกรรมจบแล้ว
                        </p>
                        <p className="mt-0.5 text-xs text-fg-muted">
                          ตรวจสอบการเข้าร่วมและประเมินทักษะผู้เข้าร่วม
                        </p>
                      </div>
                    </Link>
                  </li>
                )}
              </ul>
            )}

            <div className="mt-5 space-y-2 border-t border-border pt-4">
              <Button variant="outline" asChild className="w-full justify-start">
                <Link href="/organizer/dashboard">ดูแดชบอร์ดสถิติ</Link>
              </Button>
              <Button variant="ghost" asChild className="w-full justify-start">
                <Link href="/organizer/settings">ตั้งค่าบัญชี</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
