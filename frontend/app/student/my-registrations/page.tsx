"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/ui/page-header"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { formatEventDate } from "@/components/ui/event-card"
import { Toast } from "@/components/ui/toast"
import { RegistrationEvaluation } from "@/components/student/registration-evaluation"
import { QrCheckInButton } from "@/components/student/qr-checkin-button"
import { AssessmentDialog } from "@/components/student/assessment-dialog"
import { registrationsAPI, API_BASE_URL, isCancelledByOrganizer, isActiveRegistration, EventSurveyQuestion, SurveyAnswerBody, SkillScores } from "@/lib/api"
import { categoriesBadgeLabel } from "@/lib/categories"
import { SOFT_SKILLS } from "@/lib/soft-skills"
import {
  Calendar, MapPin, Loader2, CalendarX, X, Star, Search,
  CheckCircle2, HeartHandshake, TrendingUp, ChevronDown, Check, Info, Users, ClipboardCheck, CalendarDays, Award, Hourglass, CalendarCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * ผลประเมินรายกิจกรรม — backend สร้างอัตโนมัติตอนเช็คอิน (registrations.service.ts checkIn())
 * โดยคัดลอกคะแนนจาก ActivitySoftSkill.rate ของกิจกรรมนั้น ทักษะที่ไม่ได้กำหนดไว้จะเป็น 0
 */
interface RegistrationEvaluationData extends SkillScores {
  comment?: string | null
  createdAt: string
  /** pending_approval = รอผู้จัดอนุมัติ (กิจกรรมประเมินรอบด้าน) — server ปิดคะแนนเป็น 0 ไว้แล้ว */
  status?: string
}

interface Registration {
  id: number
  status: string
  attendance: string
  registerDate: string
  /** เวลาเช็คอินจริง — backend เขียนพร้อมสร้าง evaluation ในธุรกรรมเดียวกัน */
  checkInTime?: string | null
  evaluation?: RegistrationEvaluationData | null
  activity: {
    id: number
    name: string
    date: string
    startTime: string
    endTime: string
    location: string
    categories: string[]
    imageUrl?: string
    status?: string
    approvalStatus?: string
    cancellationReason?: string | null
    /** Prisma Decimal ส่งมาเป็น string เสมอ — ไม่ใช่ number */
    volunteerHours?: string | null
    volunteerRole?: string | null
    /** ผู้จัดเปิดโหมดประเมินรอบด้าน (ตนเอง + เพื่อน) ไว้หรือไม่ */
    peerAssessmentEnabled?: boolean
  }
}

/** รวมชั่วโมงจิตอาสาของกิจกรรมที่เช็คอินแล้วเท่านั้น — ที่ยังไม่ไปร่วมยังไม่นับเป็นชั่วโมงสะสม */
function totalVolunteerHours(registrations: Registration[]): number {
  return registrations
    .filter((r) => !!r.evaluation)
    .reduce((sum, r) => sum + Number(r.activity.volunteerHours ?? 0), 0)
}

/** จำนวนทักษะ (จาก 12 ด้าน) ที่เคยได้คะแนนมากกว่า 0 อย่างน้อยหนึ่งครั้ง */
function distinctSkillsEarned(registrations: Registration[]): number {
  return SOFT_SKILLS.filter((skill) =>
    registrations.some((r) => (r.evaluation?.[skill.field] ?? 0) > 0)
  ).length
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })
}

/** สถานะการลงทะเบียน — ตรงกับ RegistrationStatus ใน backend/prisma/schema.prisma */
const STATUS_BADGE: Record<string, { label: string; variant: "success" | "warning" | "danger" }> = {
  confirmed: { label: "ยืนยันแล้ว", variant: "success" },
  cancelled: { label: "ยกเลิกแล้ว", variant: "danger" },
  pending: { label: "รอดำเนินการ", variant: "warning" },
}

/**
 * คำอธิบายต่อแท็บ — อิงจาก business logic จริง: evaluation ถูกสร้างพร้อมเช็คอินเสมอ
 * (registrations.service.ts checkIn()) และยกเลิกไม่ได้แล้วหลังเช็คอิน (cancel()) จึงไม่มีทาง
 * ที่ registration จะมีทั้ง evaluation และ status "cancelled" พร้อมกัน — 4 กลุ่มนี้เลยแบ่งข้อมูล
 * ทั้งหมดแบบไม่ทับซ้อนและไม่ตกหล่นพอดี
 */
const TAB_INFO: Record<"pending" | "confirmed" | "evaluated" | "cancelled", string> = {
  pending: "คุณลงทะเบียนกิจกรรมนี้ไว้แล้ว ระบบกำลังรอให้ผู้จัดกิจกรรมยืนยันที่นั่งให้คุณ ระหว่างนี้ยังสามารถยกเลิกได้",
  confirmed: "ที่นั่งของคุณได้รับการยืนยันจากผู้จัดแล้ว รอถึงวันจัดกิจกรรมและเช็คอินหน้างาน ยังสามารถยกเลิกได้จนกว่าจะเช็คอิน",
  evaluated: "คุณเช็คอินเข้าร่วมกิจกรรมนี้แล้ว และได้รับการประเมินคะแนน Soft Skills เรียบร้อย ไม่สามารถยกเลิกรายการนี้ได้อีก",
  cancelled: "รายการที่คุณยกเลิกเอง หรือกิจกรรมที่ผู้จัดกิจกรรมยกเลิกทั้งงาน จะแสดงรวมอยู่ในหมวดนี้",
}

const EMPTY_STATE_TEXT: Record<"pending" | "confirmed" | "evaluated" | "cancelled", { title: string; body: string }> = {
  pending: { title: "ไม่มีรายการที่รอการยืนยัน", body: "เมื่อคุณลงทะเบียนกิจกรรมใหม่ รายการจะมาแสดงที่นี่จนกว่าผู้จัดจะยืนยันที่นั่ง" },
  confirmed: { title: "ไม่มีกิจกรรมที่ยืนยันแล้วและรอเข้าร่วม", body: "รายการที่ผู้จัดยืนยันที่นั่งให้แล้วแต่ยังไม่ถึงวันงานจะแสดงที่นี่" },
  evaluated: { title: "ยังไม่มีกิจกรรมที่ประเมินผลแล้ว", body: "หลังเช็คอินเข้าร่วมกิจกรรมและได้รับการประเมิน Soft Skills รายการจะย้ายมาที่นี่" },
  cancelled: { title: "ไม่มีรายการที่ถูกยกเลิก", body: "รายการที่คุณยกเลิกเอง หรือกิจกรรมที่ผู้จัดยกเลิกทั้งงาน จะแสดงที่นี่" },
}

type TabKey = "pending" | "confirmed" | "evaluated" | "cancelled"

interface SidebarTab {
  key: TabKey
  label: string
  count: number
}

const GUIDE_STEPS = [
  {
    title: "รอยืนยัน",
    body: "คุณกดลงทะเบียนแล้ว กำลังรอผู้จัดกิจกรรมยืนยันที่นั่งให้",
    note: "ยกเลิกได้",
    icon: Hourglass,
  },
  {
    title: "ยืนยันแล้ว",
    body: "ผู้จัดยืนยันที่นั่งแล้ว ให้ไปเช็คอินหน้างานในวันจัดกิจกรรม",
    note: "ยกเลิกได้จนกว่าจะเช็คอิน",
    icon: CalendarCheck,
  },
  {
    title: "ประเมินแล้ว",
    body: "เช็คอินสำเร็จ ระบบบันทึกคะแนน Soft Skills และชั่วโมงจิตอาสาให้คุณ",
    note: "ยกเลิกไม่ได้แล้ว",
    icon: Award,
  },
]

/** ปุ่ม "i" เล็กๆ — กดแล้วเปิด GuideDialog */
function GuideButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="หน้านี้ใช้ทำอะไร และสถานะเปลี่ยนอย่างไร"
      className={cn(
        "group/info relative inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100 transition-all duration-200 hover:scale-110 hover:bg-brand-600 hover:text-white hover:shadow-md active:scale-95",
        className
      )}
    >
      <span aria-hidden="true" className="absolute inset-0 rounded-full bg-brand-400/40 motion-safe:animate-ping [animation-iteration-count:2]" />
      <Info className="relative size-4 transition-transform duration-300 group-hover/info:rotate-[360deg]" aria-hidden="true" />
    </button>
  )
}

/** คำอธิบายหน้า — popup บอกว่าสถานะเปลี่ยนจากอะไรไปอะไรและเกิดจากอะไร */
function GuideDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <div className="mb-1 flex size-11 items-center justify-center rounded-2xl bg-brand-50 ring-1 ring-inset ring-brand-100 motion-safe:animate-icon-pop">
            <Info className="size-6 text-brand-600" aria-hidden="true" />
          </div>
          <DialogTitle>หน้านี้ใช้ทำอะไร และสถานะเปลี่ยนอย่างไร</DialogTitle>
          <DialogDescription>
            ทุกกิจกรรมที่คุณลงทะเบียนจะมาแสดงที่นี่ และสถานะจะเปลี่ยนไปเองตามลำดับด้านล่าง
            กดที่สถานะทางซ้ายเพื่อดูกิจกรรมในแต่ละขั้น
          </DialogDescription>
        </DialogHeader>

        <ol className="py-2">
          {GUIDE_STEPS.map((step, i) => {
            const isLast = i === GUIDE_STEPS.length - 1
            return (
              <li
                key={step.title}
                className="flex gap-4 motion-safe:animate-rise-in"
                style={{ animationDelay: `${100 + i * 110}ms` }}
              >
                <div className="flex flex-col items-center">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm">
                    <step.icon className="size-5" aria-hidden="true" />
                  </span>
                  {!isLast && <span className="my-1 min-h-6 w-0.5 flex-1 rounded-full bg-brand-200" />}
                </div>
                <div className={cn("min-w-0 flex-1", !isLast && "pb-5")}>
                  <p className="text-sm font-bold text-fg">
                    <span className="mr-1.5 text-brand-600">{i + 1}.</span>
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-fg-muted">{step.body}</p>
                  <span className="mt-1.5 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                    {step.note}
                  </span>
                </div>
              </li>
            )
          })}
        </ol>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div
            className="rounded-xl border border-danger bg-danger-bg p-3 motion-safe:animate-rise-in"
            style={{ animationDelay: "460ms" }}
          >
            <p className="text-sm font-bold text-danger">ยกเลิกแล้ว</p>
            <p className="mt-1 text-sm leading-relaxed text-fg-muted">
              เกิดเมื่อคุณยกเลิกเอง หรือผู้จัดยกเลิกกิจกรรมทั้งงาน (จะมีเหตุผลแสดงในการ์ด) ที่นั่งจะถูกปล่อยคืน
            </p>
          </div>
          <div
            className="rounded-xl border border-border bg-warning-bg p-3 motion-safe:animate-rise-in"
            style={{ animationDelay: "540ms" }}
          >
            <p className="text-sm font-bold text-fg">กิจกรรมประเมินรอบด้าน</p>
            <p className="mt-1 text-sm leading-relaxed text-fg-muted">
              บางกิจกรรมต้องประเมินตนเองและเพื่อน คะแนนจะแสดงเมื่อผู้จัดอนุมัติแล้ว
              ระหว่างนั้นการ์ดจะมีป้าย &quot;รออนุมัติผล&quot;
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * แถบสถานะด้านซ้าย — stepper แนวตั้งแบบเดียวกับ organizer/create (รอยืนยัน → ยืนยันแล้ว → ประเมินแล้ว)
 * ส่วน "ยกเลิกแล้ว" แยกออกมาเป็นอีกทาง บนมือถือแสดงเป็นแถบเลื่อนแนวนอนแทน
 */
function StatusSidebar({
  tabs,
  active,
  onSelect,
  onOpenGuide,
}: {
  tabs: SidebarTab[]
  active: TabKey
  onSelect: (key: TabKey) => void
  onOpenGuide: () => void
}) {
  const flow = tabs.filter((t) => t.key !== "cancelled")
  const cancelTab = tabs.find((t) => t.key === "cancelled")!
  const activeIndex = flow.findIndex((t) => t.key === active)

  return (
    <>
      {/* มือถือ: แถบเลื่อนแนวนอน */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="-mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 py-1">
          {tabs.map((tab) => {
            const isActive = active === tab.key
            const isCancel = tab.key === "cancelled"
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onSelect(tab.key)}
                aria-pressed={isActive}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all",
                  isActive
                    ? isCancel
                      ? "border-danger bg-danger-bg text-danger shadow-xs"
                      : "border-brand-600 bg-brand-600 text-white shadow-sm"
                    : "border-border bg-bg text-fg-muted"
                )}
              >
                {tab.label}
                <span className="text-xs font-bold tabular-nums opacity-80">{tab.count}</span>
              </button>
            )
          })}
        </div>
        <GuideButton onClick={onOpenGuide} />
      </div>

      {/* เดสก์ท็อป: stepper แนวตั้ง — top-24 เว้นระยะใต้ AppHeader */}
      <nav
        aria-label="สถานะการลงทะเบียน"
        className="hidden md:sticky md:top-24 md:block md:rounded-2xl md:border md:border-border md:bg-bg md:p-4 md:shadow-xs"
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-fg-subtle">สถานะ</span>
          <GuideButton onClick={onOpenGuide} />
        </div>

        <div className="flex flex-col">
          {flow.map((tab, i) => {
            const isActive = active === tab.key
            const isPassed = activeIndex >= 0 && i < activeIndex
            const isLast = i === flow.length - 1
            return (
              <div key={tab.key} className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-300",
                      isActive
                        ? "scale-110 bg-brand-600 text-white shadow-md ring-4 ring-brand-100"
                        : isPassed
                          ? "bg-brand-100 text-brand-600"
                          : "border-2 border-border bg-bg text-fg-subtle"
                    )}
                  >
                    {isPassed ? <Check className="size-4" aria-hidden="true" /> : i + 1}
                  </span>
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "my-1 min-h-6 w-0.5 flex-1 rounded-full transition-colors duration-500",
                        isPassed ? "bg-brand-600" : "bg-border"
                      )}
                    />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onSelect(tab.key)}
                  aria-pressed={isActive}
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "-mt-0.5 mb-2 min-w-0 flex-1 rounded-xl px-3 py-2 text-left transition-all duration-200",
                    isActive ? "bg-brand-50" : "hover:bg-surface",
                    isLast && "mb-0"
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className={cn("text-sm font-bold", isActive ? "text-brand-700" : "text-fg")}>{tab.label}</span>
                    <span
                      aria-label={`${tab.count} รายการ`}
                      className={cn(
                        "min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs font-bold tabular-nums transition-colors",
                        isActive ? "bg-brand-600 text-white" : "bg-surface-2 text-fg-muted"
                      )}
                    >
                      {tab.count}
                    </span>
                  </span>
                  {/* คำอธิบายสถานะ — คลี่ออกเฉพาะขั้นที่เลือก */}
                  <span
                    className={cn(
                      "grid transition-all duration-300 ease-out",
                      isActive ? "mt-1.5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <span className="overflow-hidden text-xs leading-relaxed text-fg-muted">{TAB_INFO[tab.key]}</span>
                  </span>
                </button>
              </div>
            )
          })}
        </div>

        {/* ยกเลิกแล้ว — แยกจากลำดับหลัก */}
        <div className="my-3 border-t border-dashed border-border-strong" />
        <button
          type="button"
          onClick={() => onSelect(cancelTab.key)}
          aria-pressed={active === "cancelled"}
          className={cn(
            "flex w-full items-center gap-3.5 rounded-xl px-1.5 py-1.5 text-left transition-all duration-200",
            active === "cancelled" ? "bg-danger-bg" : "hover:bg-surface"
          )}
        >
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full transition-all duration-300",
              active === "cancelled"
                ? "scale-110 bg-danger text-white shadow-md ring-4 ring-danger-bg"
                : "border-2 border-border bg-bg text-fg-subtle"
            )}
          >
            <X className="size-4" aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
            <span className={cn("text-sm font-bold", active === "cancelled" ? "text-danger" : "text-fg")}>
              {cancelTab.label}
            </span>
            <span
              aria-label={`${cancelTab.count} รายการ`}
              className={cn(
                "min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs font-bold tabular-nums",
                active === "cancelled" ? "bg-danger text-white" : "bg-surface-2 text-fg-muted"
              )}
            >
              {cancelTab.count}
            </span>
          </span>
        </button>
      </nav>
    </>
  )
}

/** ช่องข้อมูลย่อยในการ์ด — ไอคอน + ข้อความบรรทัดเดียว */
function InfoItem({
  icon: Icon,
  tone,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>
  tone: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-fg-muted">
      <Icon className={cn("size-3.5 shrink-0", tone)} aria-hidden="true" />
      <span className="min-w-0 truncate">{children}</span>
    </div>
  )
}

export default function MyRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>("pending")
  const [guideOpen, setGuideOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"date_asc" | "date_desc" | "registered_desc" | "name_asc">("date_asc")
  const [message, setMessage] = useState("")
  // เก็บชนิดของข้อความแยกไว้ ไม่เดาจากตัวข้อความ —
  // "ยกเลิกไม่สำเร็จ".includes("สำเร็จ") เป็น true จึงเคยขึ้นกล่องเขียวตอนพัง
  const [messageType, setMessageType] = useState<"success" | "error">("success")

  // แบบสำรวจความพึงพอใจ — เปิดเป็น dialog ต่อรายการลงทะเบียน
  const [surveyRegId, setSurveyRegId] = useState<number | null>(null)
  const [assessmentRegId, setAssessmentRegId] = useState<number | null>(null)
  const [surveyQuestions, setSurveyQuestions] = useState<EventSurveyQuestion[]>([])
  const [surveyAnswers, setSurveyAnswers] = useState<Record<number, { ratingValue?: number; textValue?: string }>>({})
  const [surveyLoading, setSurveyLoading] = useState(false)
  const [surveySubmitting, setSurveySubmitting] = useState(false)
  const [surveyError, setSurveyError] = useState("")

  // การ์ดไหนกางผลประเมินอยู่บ้าง — กางได้หลายใบพร้อมกัน ไม่ต้องปิดใบเดิมก่อน
  const [expandedEvaluations, setExpandedEvaluations] = useState<number[]>([])

  // ยืนยันก่อนยกเลิกลงทะเบียน — ใช้ ConfirmDialog แทน confirm() ของเบราว์เซอร์
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState(false)

  // ป๊อปอัปแจ้งผลสำเร็จแบบลอย — pattern เดียวกับหน้า activities/[id], events/[id], profile
  const [toast, setToast] = useState<{ open: boolean; message: string; description?: string }>({
    open: false,
    message: "",
  })
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (message: string, description?: string) => {
    setToast({ open: true, message, description })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast((prev) => ({ ...prev, open: false })), 2500)
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  useEffect(() => {
    loadRegistrations()
  }, [])

  // ค่าเริ่มต้นของการเรียงลำดับตามความหมายของแต่ละแท็บ — รอยืนยัน/ยืนยันแล้ว เป็นกิจกรรมที่ยังไม่จัด
  // จึงเรียงวันเก่า→ใหม่ให้อันที่จะถึงก่อนอยู่บนสุด ส่วนประเมินแล้ว/ยกเลิกแล้ว จบไปแล้ว จึงเรียงใหม่→เก่า
  useEffect(() => {
    setSortBy(activeTab === "pending" || activeTab === "confirmed" ? "date_asc" : "date_desc")
  }, [activeTab])

  async function loadRegistrations() {
    try {
      setLoading(true)
      const data = await registrationsAPI.getMy()
      setRegistrations(Array.isArray(data) ? data : [])
    } catch {
      setRegistrations([])
    } finally {
      setLoading(false)
    }
  }

  async function confirmCancel() {
    if (cancelTargetId == null) return
    setMessage("")
    setCancelling(true)
    try {
      await registrationsAPI.cancel(cancelTargetId)
      setCancelTargetId(null)
      showToast("ยกเลิกการลงทะเบียนแล้ว")
      loadRegistrations()
    } catch (err: unknown) {
      const e = err as Error
      setMessageType("error")
      setMessage(e.message || "ยกเลิกไม่สำเร็จ")
    } finally {
      setCancelling(false)
    }
  }

  async function openSurvey(regId: number) {
    setSurveyRegId(regId)
    setSurveyAnswers({})
    setSurveyError("")
    setSurveyLoading(true)
    try {
      const qs = await registrationsAPI.getSurveyQuestions(regId)
      setSurveyQuestions(qs)
    } catch (err: unknown) {
      const e = err as Error
      setSurveyError(e.message || "โหลดแบบสำรวจไม่สำเร็จ")
      setSurveyQuestions([])
    } finally {
      setSurveyLoading(false)
    }
  }

  async function handleSubmitSurvey() {
    if (!surveyRegId) return
    setSurveySubmitting(true)
    setSurveyError("")
    try {
      const payload: SurveyAnswerBody[] = Object.entries(surveyAnswers).map(([questionId, a]) => ({
        questionId: Number(questionId),
        ratingValue: a.ratingValue,
        textValue: a.textValue,
      }))
      await registrationsAPI.submitSurvey(surveyRegId, payload)
      setSurveyRegId(null)
      setMessageType("success")
      setMessage("ขอบคุณสำหรับการให้คะแนน!")
      loadRegistrations()
    } catch (err: unknown) {
      const e = err as Error
      setSurveyError(e.message || "ส่งแบบสำรวจไม่สำเร็จ")
    } finally {
      setSurveySubmitting(false)
    }
  }

  const tabRegs = registrations.filter((r) => {
    if (activeTab === "pending") return r.status === "pending"
    if (activeTab === "confirmed") return r.status === "confirmed" && !r.evaluation
    if (activeTab === "evaluated") return !!r.evaluation
    return r.status === "cancelled"
  })

  const q = searchQuery.trim().toLowerCase()
  const filteredRegs = [...tabRegs]
    .filter((r) => !q || r.activity.name.toLowerCase().includes(q))
    .sort((a, b) => {
      if (sortBy === "name_asc") return a.activity.name.localeCompare(b.activity.name, "th")
      // เรียงตามวันที่กดลงทะเบียน ไม่ใช่วันจัดกิจกรรม — คนละแกนกัน
      if (sortBy === "registered_desc") {
        return new Date(b.registerDate).getTime() - new Date(a.registerDate).getTime()
      }
      const da = new Date(a.activity.date).getTime()
      const db = new Date(b.activity.date).getTime()
      return sortBy === "date_asc" ? da - db : db - da
    })

  const counts = {
    pending: registrations.filter((r) => r.status === "pending").length,
    confirmed: registrations.filter((r) => r.status === "confirmed" && !r.evaluation).length,
    evaluated: registrations.filter((r) => !!r.evaluation).length,
    cancelled: registrations.filter((r) => r.status === "cancelled").length,
  }

  const TABS = [
    { key: "pending" as const, label: "รอยืนยัน", count: counts.pending },
    { key: "confirmed" as const, label: "ยืนยันแล้ว", count: counts.confirmed },
    { key: "evaluated" as const, label: "ประเมินแล้ว", count: counts.evaluated },
    { key: "cancelled" as const, label: "ยกเลิกแล้ว", count: counts.cancelled },
  ]

  // สรุปผลสะสม — เจตนาไม่เอา level/points/badges มาซ้ำกับหน้าแรกและหน้าโปรไฟล์
  // แสดงเฉพาะเมื่อเคยเข้าร่วมจริงแล้ว ไม่งั้นนักศึกษาใหม่จะเจอกล่องเลข 0 เปล่าๆ
  const volunteerHours = totalVolunteerHours(registrations)
  const SUMMARY = [
    {
      icon: CheckCircle2,
      label: "เข้าร่วมสำเร็จ",
      value: `${counts.evaluated}`,
      unit: "กิจกรรม",
      tone: "text-success",
      bgTone: "bg-success-bg",
    },
    {
      icon: HeartHandshake,
      label: "ชั่วโมงจิตอาสาสะสม",
      // ตัด .0 ทิ้งเมื่อเป็นจำนวนเต็ม — "12 ชม." อ่านง่ายกว่า "12.0 ชม."
      value: Number.isInteger(volunteerHours) ? `${volunteerHours}` : volunteerHours.toFixed(1),
      unit: "ชั่วโมง",
      tone: "text-brand-600",
      bgTone: "bg-brand-50",
    },
    {
      icon: TrendingUp,
      label: "ทักษะที่ได้รับ",
      value: `${distinctSkillsEarned(registrations)}`,
      unit: `จาก ${SOFT_SKILLS.length} ด้าน`,
      tone: "text-warning",
      bgTone: "bg-warning-bg",
    },
  ]

  return (
    // ไม่ใส่ min-h-screen — app/student/layout.tsx จัดการให้แล้ว
    <div className="bg-surface pb-12">
      {/* หัวข้อ — ไม่ใส่ sticky เพราะ AppHeader ปักที่ top-0 z-50 อยู่แล้ว แถบนี้จะมุดหายไปใต้มัน */}
      <PageHeader
        title="กิจกรรมของฉัน"
        subtitle="ติดตามสถานะการเข้าร่วมและการประเมินผลของคุณ"
        icons={[ClipboardCheck, CalendarDays, Award]}
      />

      <Container className="py-6">
        {message && (
          <div
            role="alert"
            className={cn(
              "mb-6 flex items-center justify-between gap-3 rounded-xl border border-border p-4 text-sm font-medium",
              messageType === "success" ? "bg-success-bg text-success" : "bg-danger-bg text-danger"
            )}
          >
            {message}
            <button
              type="button"
              onClick={() => setMessage("")}
              aria-label="ปิดข้อความ"
              className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <GuideDialog open={guideOpen} onOpenChange={setGuideOpen} />

        {/* ซ้าย = ลำดับสถานะ (แบบเดียวกับหน้า organizer/create) ขวา = เนื้อหา
            md:items-start เพื่อให้ sticky ของแถบสถานะมีระยะขยับ */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[250px_1fr] md:items-start md:gap-8">
          <StatusSidebar tabs={TABS} active={activeTab} onSelect={setActiveTab} onOpenGuide={() => setGuideOpen(true)} />

          <div className="min-w-0">

        {/* สรุปผลสะสม — ซ่อนตอนยังโหลดอยู่และตอนที่ยังไม่เคยเข้าร่วมกิจกรรมไหนเลย */}
        {!loading && counts.evaluated > 0 && (
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {SUMMARY.map((stat) => (
              <div
                key={stat.label}
                className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border bg-bg p-4 shadow-xs"
              >
                <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-border", stat.bgTone)}>
                  <stat.icon className={cn("size-5", stat.tone)} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-fg-muted">{stat.label}</p>
                  <p className="mt-0.5 flex items-baseline gap-1.5 text-fg">
                    <span className="text-2xl font-black tabular-nums leading-none">{stat.value}</span>
                    <span className="text-xs text-fg-muted">{stat.unit}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ค้นหา + เรียงลำดับ */}
        <div className="mb-5 flex flex-col gap-2.5 rounded-2xl border border-border bg-bg p-2.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
            <Input
              type="text"
              placeholder="ค้นหาชื่อกิจกรรม..."
              className="h-10 rounded-lg pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="my-reg-sort" className="shrink-0 text-xs font-semibold text-fg-muted">
              เรียงลำดับ
            </label>
            <Select
              id="my-reg-sort"
              className="h-10 w-full rounded-lg sm:w-60"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="date_asc">วันจัดกิจกรรม: เก่า → ใหม่</option>
              <option value="date_desc">วันจัดกิจกรรม: ใหม่ → เก่า</option>
              <option value="registered_desc">วันที่ลงทะเบียน: ล่าสุดก่อน</option>
              <option value="name_asc">ชื่อกิจกรรม: ก → ฮ</option>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="mb-4 size-12 animate-spin text-brand-600" />
            <p className="text-lg font-medium text-fg-muted">กำลังโหลดกิจกรรมของคุณ...</p>
          </div>
        ) : filteredRegs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-bg p-10 text-center shadow-xs">
            <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-surface">
              <CalendarX className="size-8 text-fg-subtle" aria-hidden="true" />
            </div>
            {q && tabRegs.length > 0 ? (
              <>
                <h3 className="mb-2 text-xl font-bold text-fg">ไม่พบกิจกรรมที่ตรงกับคำค้นหา</h3>
                <p className="mx-auto mb-8 max-w-sm text-fg-muted">ลองค้นด้วยคำอื่น หรือล้างคำค้นหาเพื่อดูรายการทั้งหมด</p>
                <Button variant="outline" className="rounded-xl px-8" onClick={() => setSearchQuery("")}>
                  ล้างคำค้นหา
                </Button>
              </>
            ) : (
              <>
                <h3 className="mb-2 text-xl font-bold text-fg">{EMPTY_STATE_TEXT[activeTab].title}</h3>
                <p className="mx-auto mb-8 max-w-sm text-fg-muted">{EMPTY_STATE_TEXT[activeTab].body}</p>
                <Button className="rounded-xl px-8" asChild>
                  <Link href="/student/events">ไปหน้ากิจกรรม</Link>
                </Button>
              </>
            )}
          </div>
        ) : (
          <div key={activeTab} className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-3">
            {filteredRegs.map((reg, idx) => {
              const st = STATUS_BADGE[reg.status] ?? STATUS_BADGE.pending
              const isExpanded = expandedEvaluations.includes(reg.id)
              const cancelledByOrganizer = isCancelledByOrganizer(reg.activity.approvalStatus)

              return (
                /* การ์ดทรง "ตั๋ว" — รูปด้านบน และรอยปรุตัดครึ่งก่อนถึงปุ่ม */
                <article
                  key={reg.id}
                  style={{ animationDelay: `${Math.min(idx, 8) * 60}ms` }}
                  className="group relative flex flex-col overflow-hidden rounded-[28px] border border-border bg-bg shadow-xs transition-all duration-300 motion-safe:animate-rise-in hover:-translate-y-1 hover:shadow-md"
                >
                  {/* รูปกิจกรรม — ภาพเต็มความกว้างสัดส่วนเตี้ย ไม่มีแถบสี */}
                  <div className="relative h-36 shrink-0 overflow-hidden bg-surface-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        reg.activity?.imageUrl
                          ? `${API_BASE_URL}${reg.activity.imageUrl}`
                          : "/activity-placeholder.svg"
                      }
                      alt={reg.activity.name}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                    {reg.activity.categories.length > 0 && (
                      <span className="absolute left-3 top-3 max-w-[70%] truncate rounded-full bg-bg/95 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-700 shadow-sm">
                        {categoriesBadgeLabel(reg.activity.categories)}
                      </span>
                    )}
                  </div>

                  <div className="relative flex min-w-0 flex-1 flex-col px-4 pb-1 pt-3">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant={st.variant}>{st.label}</Badge>

                      {reg.status === "confirmed" && (
                        <Badge variant={reg.attendance === "attended" ? "info" : "neutral"}>
                          {reg.attendance === "attended" ? "✓ เข้าร่วมแล้ว" : "ยังไม่เข้างาน"}
                        </Badge>
                      )}

                      {!!reg.evaluation &&
                        (reg.evaluation.status === "pending_approval" ? (
                          <Badge variant="warning">รออนุมัติผล</Badge>
                        ) : (
                          <Badge variant="default">ประเมินแล้ว</Badge>
                        ))}

                      {cancelledByOrganizer && <Badge variant="danger">กิจกรรมถูกยกเลิก</Badge>}
                      {reg.activity.status === "completed" && !cancelledByOrganizer && (
                        <Badge variant="neutral">กิจกรรมจบแล้ว</Badge>
                      )}
                    </div>

                    <h3 className="mb-2.5 line-clamp-2 text-base font-bold leading-snug text-fg">{reg.activity.name}</h3>

                    {/* เหตุผลที่ผู้จัดยกเลิก — เดิมเก็บลง DB แล้วไม่เคยแสดงให้นักศึกษาเห็น */}
                    {cancelledByOrganizer && (
                      <div className="mb-2.5 rounded-2xl border border-danger bg-danger-bg px-3 py-2">
                        <p className="text-xs font-semibold text-danger">ผู้จัดยกเลิกกิจกรรมนี้</p>
                        <p className="mt-0.5 text-xs text-fg-muted">
                          {reg.activity.cancellationReason
                            ? `เหตุผล: ${reg.activity.cancellationReason}`
                            : "ผู้จัดไม่ได้ระบุเหตุผล"}
                        </p>
                      </div>
                    )}

                    <div className="mt-auto space-y-1.5 pb-1">
                      <InfoItem icon={Calendar} tone="text-brand-500">
                        {formatEventDate(reg.activity.date)} · {reg.activity.startTime}-{reg.activity.endTime}
                      </InfoItem>
                      <InfoItem icon={MapPin} tone="text-danger">
                        {reg.activity.location}
                      </InfoItem>

                      {/* เวลาเช็คอินจริง — เดิม backend บันทึกไว้แต่ไม่เคยแสดงที่ไหนในระบบ */}
                      {reg.checkInTime && (
                        <InfoItem icon={CheckCircle2} tone="text-success">
                          เช็คอิน {formatDateTime(reg.checkInTime)}
                        </InfoItem>
                      )}

                      {/* ชั่วโมงจิตอาสา — นับสะสมจริงเมื่อเช็คอินแล้วเท่านั้น */}
                      {reg.activity.volunteerHours && (
                        <InfoItem icon={HeartHandshake} tone="text-brand-500">
                          จิตอาสา {Number(reg.activity.volunteerHours)} ชม.
                          {reg.activity.volunteerRole ? ` · ${reg.activity.volunteerRole}` : ""}
                        </InfoItem>
                      )}
                    </div>

                    {/* ผลประเมินของกิจกรรมนี้ — กางในการ์ด ไม่ใช่กระโดดไปหน้าโปรไฟล์ที่แสดงค่าเฉลี่ยรวม */}
                    {reg.evaluation && isExpanded && (
                      <div className="mt-3">
                        <RegistrationEvaluation
                          scores={reg.evaluation}
                          comment={reg.evaluation.comment}
                          status={reg.evaluation.status}
                        />
                      </div>
                    )}
                  </div>

                  {/* รอยปรุตั๋ว — เส้นประ + รอยบากครึ่งวงกลมที่ขอบซ้าย-ขวา */}
                  <div aria-hidden="true" className="relative my-2.5 h-0 border-t-2 border-dashed border-border">
                    <span className="absolute -left-2.5 -top-2.5 size-5 rounded-full border border-border bg-surface" />
                    <span className="absolute -right-2.5 -top-2.5 size-5 rounded-full border border-border bg-surface" />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3.5">
                    <Button size="sm" className="rounded-full px-4 font-bold shadow-sm" asChild>
                      <Link href={`/student/activities/${reg.activity.id}?from=my-registrations`}>รายละเอียด</Link>
                    </Button>

                    {reg.status === "confirmed" && reg.attendance !== "attended" && (
                      <QrCheckInButton activityId={reg.activity.id} activityName={reg.activity.name} />
                    )}

                    {reg.attendance === "attended" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full bg-bg font-bold"
                        onClick={() => openSurvey(reg.id)}
                      >
                        <Star className="size-4" aria-hidden="true" /> ให้คะแนน
                      </Button>
                    )}

                    {reg.attendance === "attended" &&
                      reg.activity.status === "completed" &&
                      reg.activity.peerAssessmentEnabled && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full bg-bg font-bold"
                          onClick={() => setAssessmentRegId(reg.id)}
                        >
                          <Users className="size-4" aria-hidden="true" /> ประเมินเพื่อน
                        </Button>
                      )}

                    {!!reg.evaluation && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full bg-bg font-bold"
                        aria-expanded={isExpanded}
                        onClick={() =>
                          setExpandedEvaluations((prev) =>
                            prev.includes(reg.id) ? prev.filter((id) => id !== reg.id) : [...prev, reg.id]
                          )
                        }
                      >
                        <ChevronDown
                          className={cn("size-4 transition-transform", isExpanded && "rotate-180")}
                          aria-hidden="true"
                        />
                        {isExpanded ? "ซ่อนผลประเมิน" : "ผลประเมิน"}
                      </Button>
                    )}

                    {!!reg.evaluation && (
                      <Button variant="ghost" size="sm" className="rounded-full font-bold" asChild>
                        <Link href="/student/profile">ภาพรวมทักษะ</Link>
                      </Button>
                    )}

                    {isActiveRegistration(reg) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto rounded-full font-bold text-danger hover:bg-danger-bg hover:text-danger"
                        onClick={() => setCancelTargetId(reg.id)}
                      >
                        ยกเลิก
                      </Button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
          </div>
        </div>
      </Container>

      <AssessmentDialog registrationId={assessmentRegId} onClose={() => setAssessmentRegId(null)} />

      {/* แบบสำรวจความพึงพอใจ */}
      <Dialog open={surveyRegId !== null} onOpenChange={(open) => !open && setSurveyRegId(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>แบบสำรวจความพึงพอใจ</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {surveyError && (
              <div className="rounded-lg border border-danger bg-danger-bg px-4 py-3 text-sm text-danger">
                {surveyError}
              </div>
            )}

            {surveyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-8 animate-spin text-brand-600" aria-hidden="true" />
              </div>
            ) : surveyQuestions.length === 0 ? (
              !surveyError && <p className="text-sm text-fg-muted">กิจกรรมนี้ไม่มีแบบสำรวจ</p>
            ) : (
              surveyQuestions.map((q) => (
                <div key={q.id} className="space-y-2">
                  <Label>{q.label}</Label>
                  {q.type === "rating" ? (
                    <div className="flex gap-1">
                      {Array.from({ length: q.scaleMax }).map((_, i) => {
                        const value = i + 1
                        const selected = (surveyAnswers[q.id]?.ratingValue ?? 0) >= value
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setSurveyAnswers((prev) => ({ ...prev, [q.id]: { ratingValue: value } }))}
                            aria-label={`${value} ดาว`}
                          >
                            <Star
                              className={cn("size-7", selected ? "fill-warning text-warning" : "text-border-strong")}
                              aria-hidden="true"
                            />
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <Textarea
                      value={surveyAnswers[q.id]?.textValue || ""}
                      onChange={(e) =>
                        setSurveyAnswers((prev) => ({ ...prev, [q.id]: { textValue: e.target.value } }))
                      }
                      className="min-h-[80px]"
                    />
                  )}
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSurveyRegId(null)} disabled={surveySubmitting}>
              ปิด
            </Button>
            {surveyQuestions.length > 0 && (
              <Button onClick={handleSubmitSurvey} disabled={surveySubmitting}>
                {surveySubmitting ? "กำลังส่ง..." : "ส่งแบบสำรวจ"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={cancelTargetId !== null}
        onOpenChange={(open) => !open && setCancelTargetId(null)}
        title="ยกเลิกการลงทะเบียน?"
        description="เมื่อยกเลิกแล้ว ที่นั่งของคุณจะถูกปล่อยคืนให้ผู้อื่น และต้องลงทะเบียนใหม่หากเปลี่ยนใจภายหลัง"
        confirmLabel="ยกเลิกการลงทะเบียน"
        cancelLabel="ไม่ยกเลิก"
        tone="danger"
        loading={cancelling}
        onConfirm={confirmCancel}
      />

      <Toast open={toast.open} message={toast.message} description={toast.description} />
    </div>
  )
}
