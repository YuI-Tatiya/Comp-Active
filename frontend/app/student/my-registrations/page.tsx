"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Toast } from "@/components/ui/toast"
import { AssessmentDialog } from "@/components/student/assessment-dialog"
import {
  BUCKET_LABEL,
  MyRegistrationsHero,
  PipelineCard,
  PipelineTabsMobile,
  RegistrationCard,
  RegistrationCardSkeleton,
  type MyRegistration,
} from "@/components/student/my-registrations-ui"
import { registrationsAPI, EventSurveyQuestion, SurveyAnswerBody } from "@/lib/api"
import { registrationBucket, type RegistrationBucket } from "@/lib/registration-bucket"
import { SOFT_SKILLS } from "@/lib/soft-skills"
import { Loader2, CalendarX, X, Star, Search, CheckCircle2, HeartHandshake, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

/** รวมชั่วโมงจิตอาสาของกิจกรรมที่เช็คอินแล้วเท่านั้น — ที่ยังไม่ไปร่วมยังไม่นับเป็นชั่วโมงสะสม */
function totalVolunteerHours(registrations: MyRegistration[]): number {
  return registrations
    .filter((r) => !!r.evaluation)
    .reduce((sum, r) => sum + Number(r.activity.volunteerHours ?? 0), 0)
}

/** จำนวนทักษะ (จาก 12 ด้าน) ที่เคยได้คะแนนมากกว่า 0 อย่างน้อยหนึ่งครั้ง */
function distinctSkillsEarned(registrations: MyRegistration[]): number {
  return SOFT_SKILLS.filter((skill) =>
    registrations.some((r) => (r.evaluation?.[skill.field] ?? 0) > 0)
  ).length
}

const EMPTY_STATE_TEXT: Record<RegistrationBucket, { title: string; body: string }> = {
  pending: { title: "ไม่มีรายการที่รอการยืนยัน", body: "เมื่อคุณลงทะเบียนกิจกรรมใหม่ รายการจะมาแสดงที่นี่จนกว่าผู้จัดจะยืนยันที่นั่ง" },
  confirmed: { title: "ไม่มีกิจกรรมที่ยืนยันแล้วและรอเข้าร่วม", body: "รายการที่ผู้จัดยืนยันที่นั่งให้แล้วแต่ยังไม่ถึงวันงานจะแสดงที่นี่" },
  evaluated: { title: "ยังไม่มีกิจกรรมที่ประเมินผลแล้ว", body: "หลังเช็คอินเข้าร่วมกิจกรรมและได้รับการประเมิน Soft Skills รายการจะย้ายมาที่นี่" },
  cancelled: { title: "ไม่มีรายการที่ถูกยกเลิก", body: "รายการที่คุณยกเลิกเอง หรือกิจกรรมที่ผู้จัดยกเลิกทั้งงาน จะแสดงที่นี่" },
}

type SortKey = "date_asc" | "date_desc" | "registered_desc" | "name_asc"

/**
 * ค่าเริ่มต้นของการเรียงลำดับตามความหมายของแต่ละสถานะ — รอยืนยัน/ยืนยันแล้ว เป็นกิจกรรมที่ยังไม่จัด
 * จึงเรียงวันเก่า→ใหม่ให้อันที่จะถึงก่อนอยู่บนสุด ส่วนประเมินแล้ว/ยกเลิกแล้ว จบไปแล้ว จึงเรียงใหม่→เก่า
 */
function defaultSort(bucket: RegistrationBucket): SortKey {
  return bucket === "pending" || bucket === "confirmed" ? "date_asc" : "date_desc"
}

/** ช่องค้นหา/เรียงลำดับ — สูง 48px เส้นขอบกรมท่าอ่อน โฟกัสเป็นกรมท่า (บนพื้นขาว ห้ามใช้อำพัน) */
const FIELD =
  "h-12 rounded-xl border-[1.5px] border-denim-field bg-white text-[15px] text-denim-deep hover:border-denim-dash focus-visible:border-denim focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-denim"

export default function MyRegistrationsPage() {
  const [registrations, setRegistrations] = useState<MyRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<RegistrationBucket>("pending")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortKey>(defaultSort("pending"))
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

  function selectTab(bucket: RegistrationBucket) {
    setActiveTab(bucket)
    setSortBy(defaultSort(bucket))
  }

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

  // ทุกรายการลงได้สถานะเดียวพอดี (lib/registration-bucket.ts) — นับและกรองจากฟังก์ชันเดียวกัน ตัวเลขบนการ์ดสถานะจึงตรงกับรายการเสมอ
  const counts: Record<RegistrationBucket, number> = { pending: 0, confirmed: 0, evaluated: 0, cancelled: 0 }
  for (const r of registrations) counts[registrationBucket(r)]++

  const tabRegs = registrations.filter((r) => registrationBucket(r) === activeTab)

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

  // สรุปผลสะสม — เจตนาไม่เอา level/points/badges มาซ้ำกับหน้าแรกและหน้าโปรไฟล์
  // แสดงเฉพาะเมื่อเคยเข้าร่วมจริงแล้ว ไม่งั้นนักศึกษาใหม่จะเจอกล่องเลข 0 เปล่าๆ
  const volunteerHours = totalVolunteerHours(registrations)
  const SUMMARY = [
    { icon: CheckCircle2, label: "เข้าร่วมสำเร็จ", value: `${counts.evaluated}`, unit: "กิจกรรม" },
    {
      icon: HeartHandshake,
      label: "ชั่วโมงจิตอาสาสะสม",
      // ตัด .0 ทิ้งเมื่อเป็นจำนวนเต็ม — "12 ชม." อ่านง่ายกว่า "12.0 ชม."
      value: Number.isInteger(volunteerHours) ? `${volunteerHours}` : volunteerHours.toFixed(1),
      unit: "ชั่วโมง",
    },
    { icon: TrendingUp, label: "ทักษะที่ได้รับ", value: `${distinctSkillsEarned(registrations)}`, unit: `จาก ${SOFT_SKILLS.length} ด้าน` },
  ]

  return (
    // ไม่ใส่ min-h-screen — app/student/layout.tsx จัดการให้แล้ว
    <div className="bg-surface pb-16">
      <MyRegistrationsHero />
      <PipelineCard value={activeTab} counts={counts} loading={loading} onChange={selectTab} />
      <PipelineTabsMobile value={activeTab} counts={counts} loading={loading} onChange={selectTab} />

      <Container className="pt-5 lg:pt-6">
        {message && (
          <div
            role="alert"
            className={cn(
              "mb-5 flex items-center justify-between gap-3 rounded-xl border p-4 text-sm font-medium",
              messageType === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
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

        {/* สรุปผลสะสม — ซ่อนตอนยังโหลดอยู่และตอนที่ยังไม่เคยเข้าร่วมกิจกรรมไหนเลย
            มือถือยังเป็น 3 คอลัมน์ (ซ่อนไอคอน) — เรียงลงมา 3 กล่องดันรายการกิจกรรมตกจอแรก */}
        {!loading && counts.evaluated > 0 && (
          <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
            {SUMMARY.map((stat) => (
              <div key={stat.label} className="flex min-w-0 items-center gap-4 rounded-2xl border border-denim-line bg-white p-3 sm:p-4">
                <span className="hidden size-11 shrink-0 place-items-center rounded-xl bg-denim-chip sm:grid">
                  <stat.icon className="size-5 text-denim" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold leading-snug text-denim-muted sm:text-xs">{stat.label}</p>
                  <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 sm:mt-0.5">
                    <span className="font-display text-2xl font-bold leading-none tabular-nums text-denim-deep">{stat.value}</span>
                    <span className="text-xs text-denim-muted">{stat.unit}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <form
          role="search"
          aria-label="ค้นหากิจกรรมของฉัน"
          onSubmit={(e) => e.preventDefault()}
          className="flex items-center justify-between gap-2.5 sm:gap-3"
        >
          {/* min-w-0 + flex-1: ช่องค้นหาต้องหดได้ ไม่งั้นช่วง ~768px มันกันที่จนช่องเรียงลำดับล้นขอบขวา
              มือถือ: ค้นหา + เรียงลำดับอยู่แถวเดียว (ป้าย "เรียงลำดับ" ซ่อนไว้ให้ screen reader) ไม่ดันรายการลงไปอีกแถว */}
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-denim-muted" aria-hidden="true" />
            <input
              type="search"
              aria-label="ค้นหาชื่อกิจกรรม"
              placeholder="ค้นหาชื่อกิจกรรม..."
              className={cn(FIELD, "w-full pl-11 pr-4 placeholder:text-denim-muted/80")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <label htmlFor="my-reg-sort" className="shrink-0 text-sm font-semibold text-denim-ink max-sm:sr-only">
              เรียงลำดับ
            </label>
            <Select
              id="my-reg-sort"
              className={cn(FIELD, "w-36 pl-3 sm:w-64 sm:pl-4")}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
            >
              <option value="date_asc">วันจัดกิจกรรม: เก่า → ใหม่</option>
              <option value="date_desc">วันจัดกิจกรรม: ใหม่ → เก่า</option>
              <option value="registered_desc">วันที่ลงทะเบียน: ล่าสุดก่อน</option>
              <option value="name_asc">ชื่อกิจกรรม: ก → ฮ</option>
            </Select>
          </div>
        </form>

        <p className="mb-3 mt-6 font-code text-xs text-denim-muted" aria-live="polite">
          {loading ? "→ กำลังโหลด..." : `→ ${BUCKET_LABEL[activeTab]} · ${filteredRegs.length} กิจกรรม`}
        </p>

        {loading ? (
          <div className="grid gap-4" aria-busy="true">
            <span className="sr-only">กำลังโหลดกิจกรรมของคุณ</span>
            <RegistrationCardSkeleton />
            <RegistrationCardSkeleton />
          </div>
        ) : filteredRegs.length === 0 ? (
          <div className="rounded-[20px] border-2 border-dashed border-denim-field bg-white px-6 py-12 text-center">
            <span className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-denim-chip">
              <CalendarX className="size-7 text-denim" aria-hidden="true" />
            </span>
            {q && tabRegs.length > 0 ? (
              <>
                <h3 className="font-display text-xl font-bold text-denim-deep">ไม่พบกิจกรรมที่ตรงกับคำค้นหา</h3>
                <p className="mx-auto mb-6 mt-2 max-w-sm text-denim-muted">ลองค้นด้วยคำอื่น หรือล้างคำค้นหาเพื่อดูรายการทั้งหมด</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="inline-flex min-h-11 items-center rounded-xl border-[1.5px] border-denim-field bg-white px-6 text-sm font-semibold text-denim-deep transition-colors hover:border-denim hover:bg-denim-paper focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
                >
                  ล้างคำค้นหา
                </button>
              </>
            ) : (
              <>
                <h3 className="font-display text-xl font-bold text-denim-deep">{EMPTY_STATE_TEXT[activeTab].title}</h3>
                <p className="mx-auto mb-6 mt-2 max-w-sm text-denim-muted">{EMPTY_STATE_TEXT[activeTab].body}</p>
                <Link
                  href="/student/events"
                  className="inline-flex min-h-11 items-center rounded-xl bg-denim-deep px-6 text-sm font-semibold text-white transition-colors hover:bg-denim focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
                >
                  ไปหน้ากิจกรรม
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRegs.map((reg) => (
              <RegistrationCard
                key={reg.id}
                reg={reg}
                evaluationOpen={expandedEvaluations.includes(reg.id)}
                onToggleEvaluation={() =>
                  setExpandedEvaluations((prev) =>
                    prev.includes(reg.id) ? prev.filter((id) => id !== reg.id) : [...prev, reg.id]
                  )
                }
                onOpenSurvey={() => openSurvey(reg.id)}
                onOpenAssessment={() => setAssessmentRegId(reg.id)}
                onCancel={() => setCancelTargetId(reg.id)}
              />
            ))}
          </div>
        )}
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
