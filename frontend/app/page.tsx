"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { ActivityCard } from "@/components/ui/activity-card"
import { ActivityCardSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { activitiesAPI, Activity, PlatformStats } from "@/lib/api"
import { CATEGORIES } from "@/lib/categories"
import {
  ArrowRight,
  CalendarX,
  Users,
  MessageSquare,
  Lightbulb,
  Repeat,
  Crown,
} from "lucide-react"
import { cn } from "@/lib/utils"

const SOFT_SKILLS = [
  { icon: Users, label: "ทีมเวิร์ก", desc: "ทำงานร่วมกับผู้อื่นได้อย่างราบรื่น" },
  { icon: Crown, label: "ภาวะผู้นำ", desc: "นำทีมและตัดสินใจอย่างมีความรับผิดชอบ" },
  { icon: MessageSquare, label: "การสื่อสาร", desc: "ถ่ายทอดความคิดได้ชัดเจนและตรงประเด็น" },
  { icon: Lightbulb, label: "การแก้ปัญหา", desc: "วิเคราะห์และหาทางออกอย่างเป็นระบบ" },
  { icon: Repeat, label: "การปรับตัว", desc: "รับมือกับสถานการณ์ที่เปลี่ยนแปลงได้" },
]

/** ป้ายกำกับหัวข้อแบบมีเลข */
function SectionLabel({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2.5 text-xs font-medium tracking-wide text-fg-subtle">
      <span className="tabular-nums text-brand-600">{n}</span>
      <span className="h-px w-6 bg-border" aria-hidden="true" />
      {children}
    </p>
  )
}

export default function RootPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>("")
  const [stats, setStats] = useState<PlatformStats | null>(null)

  useEffect(() => {
    loadActivities(category)
  }, [category])

  useEffect(() => {
    activitiesAPI
      .getPlatformStats()
      .then(setStats)
      .catch((err) => console.error(err))
  }, [])

  async function loadActivities(cat: string) {
    try {
      setLoading(true)
      const data = await activitiesAPI.getAll(cat ? { category: cat } : undefined)
      // Show only up to 3 for the recommended section
      setActivities(Array.isArray(data) ? data.slice(0, 3) : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* ── Hero (asymmetric, dark) ─────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(160deg,#1e293b 0%,#0f172a 55%,#020617 100%)" }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(700px circle at 85% 10%, rgba(59,130,246,0.25), transparent)" }}
        />
        <Container className="relative py-16 md:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="mb-3 flex items-center gap-2.5 text-xs font-medium tracking-wide text-slate-400">
                <span className="tabular-nums text-brand-300">00</span>
                <span className="h-px w-6 bg-white/20" aria-hidden="true" />
                วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น
              </p>

              <h1 className="text-4xl font-bold leading-[1.15] tracking-tight text-white md:text-6xl">
                พัฒนาทักษะ
                <br />
                <span className="bg-gradient-to-r from-brand-300 to-brand-100 bg-clip-text text-transparent">
                  ผ่านกิจกรรม
                </span>
                <br />
                ที่คุณเลือกเอง
              </h1>

              <p className="mt-6 max-w-md text-base leading-relaxed text-slate-300 md:text-lg">
                เข้าร่วมกิจกรรมนอกหลักสูตร สะสมคะแนน Soft Skills ทั้ง 5 ด้าน
                และติดตามการเติบโตของตัวเองได้ในที่เดียว
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="xl"
                  asChild
                  className="bg-gradient-to-r from-brand-300 to-brand-500 text-white shadow-md hover:from-brand-300 hover:to-brand-600"
                >
                  <Link href="/auth">เริ่มต้นใช้งาน</Link>
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  asChild
                  className="border-white/20 bg-transparent text-white hover:bg-white/10"
                >
                  <Link href="/events">
                    ดูกิจกรรมทั้งหมด
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>

            {/* การ์ดสถิติซ้อนเยื้อง */}
            <div className="lg:col-span-5">
              <div className="flex flex-col gap-4 sm:flex-row lg:flex-col">
                <div className="flex-1 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm lg:ml-8">
                  <p className="text-4xl font-semibold tracking-tight text-white tabular-nums">
                    {stats ? stats.totalActivities.toLocaleString("th-TH") : "—"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">กิจกรรมบนแพลตฟอร์ม</p>
                </div>

                <div className="flex-1 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm lg:mr-8">
                  <p className="text-4xl font-semibold tracking-tight text-white tabular-nums">
                    {stats ? stats.totalParticipants.toLocaleString("th-TH") : "—"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">ผู้เข้าร่วมสะสม</p>
                </div>

                <div className="flex-1 rounded-xl border border-brand-300/30 bg-gradient-to-br from-brand-500 to-brand-700 p-6 shadow-md lg:ml-8">
                  <p className="text-4xl font-semibold tracking-tight text-white tabular-nums">5</p>
                  <p className="mt-1 text-sm text-brand-100">ทักษะที่ติดตามได้</p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── 01 กิจกรรมแนะนำ ─────────────────────────────────────────────── */}
      <section>
        <Container className="py-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionLabel n="01">กิจกรรมแนะนำ</SectionLabel>
              <h2 className="text-3xl font-semibold tracking-tight text-fg">
                กำลังเปิดรับสมัคร
              </h2>
            </div>
            <Button variant="link" asChild className="px-0">
              <Link href="/events">
                ดูทั้งหมด
                <ArrowRight />
              </Link>
            </Button>
          </div>

          {/* ตัวกรองหมวดหมู่ — มีจุดสีประจำหมวด */}
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory("")}
              aria-pressed={category === ""}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm transition-colors",
                category === ""
                  ? "border-brand-600 bg-brand-600 font-medium text-white"
                  : "border-border bg-bg text-fg-muted hover:border-border-strong hover:text-fg"
              )}
            >
              ทั้งหมด
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                aria-pressed={category === cat.value}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors",
                  category === cat.value
                    ? "border-brand-600 bg-brand-600 font-medium text-white"
                    : "border-border bg-bg text-fg-muted hover:border-border-strong hover:text-fg"
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    category === cat.value ? "bg-white" : cat.dot
                  )}
                  aria-hidden="true"
                />
                {cat.label}
              </button>
            ))}
          </div>

          <div className="mt-8">
            {loading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <ActivityCardSkeleton key={i} />
                ))}
              </div>
            ) : activities.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {activities.map((ev) => (
                  <ActivityCard key={ev.id} activity={ev} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CalendarX}
                title="ไม่พบกิจกรรมในหมวดหมู่นี้"
                description="ลองเลือกหมวดหมู่อื่น หรือดูกิจกรรมทั้งหมด"
                action={
                  <Button variant="outline" onClick={() => setCategory("")}>
                    ดูทั้งหมด
                  </Button>
                }
              />
            )}
          </div>
        </Container>
      </section>

      {/* ── 02 ทักษะ 5 ด้าน ─────────────────────────────────────────────── */}
      <section className="border-y border-border bg-surface">
        <Container className="py-16">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <SectionLabel n="02">Soft Skills</SectionLabel>
              <h2 className="text-3xl font-semibold leading-tight tracking-tight text-fg">
                5 ทักษะที่คุณจะได้
              </h2>
              <p className="mt-4 text-base leading-relaxed text-fg-muted">
                ทุกกิจกรรมกำหนดคะแนนทักษะไว้ล่วงหน้า
                ผู้จัดจะประเมินหลังจบกิจกรรม แล้วคะแนนจะสะสมเข้าโปรไฟล์ของคุณอัตโนมัติ
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-3">
              {SOFT_SKILLS.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-border bg-bg p-5 shadow-xs"
                >
                  <span className="mb-3 flex size-9 items-center justify-center rounded-lg bg-brand-50">
                    <s.icon className="size-4.5 text-brand-600" aria-hidden="true" />
                  </span>
                  <h3 className="text-sm font-semibold text-fg">{s.label}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ── 03 สำรวจตามความสนใจ ─────────────────────────────────────────── */}
      <section>
        <Container className="py-16">
          <SectionLabel n="03">หมวดหมู่</SectionLabel>
          <h2 className="text-3xl font-semibold tracking-tight text-fg">
            สำรวจตามความสนใจ
          </h2>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.value}
                href={`/events?category=${cat.value}`}
                className="group relative overflow-hidden rounded-xl border border-border bg-bg p-5 transition-colors hover:border-border-strong"
              >
                <span
                  className={cn("absolute inset-y-0 left-0 w-1", cat.dot)}
                  aria-hidden="true"
                />
                <div className="flex items-center justify-between pl-2">
                  <span className="text-base font-medium text-fg">{cat.label}</span>
                  <ArrowRight
                    className="size-4 shrink-0 text-fg-subtle transition-colors group-hover:text-brand-600"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="bg-brand-600">
        <Container className="grid items-center gap-8 py-16 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">
              พร้อมสะสมความสำเร็จหรือยัง?
            </h2>
            <p className="mt-3 max-w-md text-base text-brand-100">
              เริ่มสร้างโปรไฟล์ของคุณวันนี้ และบันทึกทุกก้าวของการเติบโต
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <Button size="xl" variant="secondary" asChild>
              <Link href="/auth">สมัครสมาชิก</Link>
            </Button>
            <Button
              size="xl"
              asChild
              className="border border-white/30 bg-transparent text-white hover:bg-white/10"
            >
              <Link href="/auth/organizer/register">สมัครเป็นผู้จัดกิจกรรม</Link>
            </Button>
          </div>
        </Container>
      </section>

      <SiteFooter />
    </div>
  )
}
