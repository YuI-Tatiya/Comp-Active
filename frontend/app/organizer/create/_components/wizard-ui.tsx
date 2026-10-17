"use client"

import Image from "next/image"
import Link from "next/link"
import { AlertCircle, ArrowRight, Check, ChevronLeft, Code2, Loader2 } from "lucide-react"
import { Container } from "@/components/layout/container"
import { TerminalPrompt, coverPattern } from "@/components/denim/denim-ui"
import { cn } from "@/lib/utils"
import { StepperCompact, StepperSidebar, type StepMeta } from "./stepper-sidebar"
import { REGISTRATION_TYPE_OPTIONS, type ActivityFormState, type EventFormState } from "./types"
import { mascotMessage, stepProgress, stepSlug } from "./wizard-progress"

/* โครงหน้าวิซาร์ดที่หน้าสร้างงาน (/organizer/create) และหน้าแก้ไขงาน (/organizer/manage/[id]/edit) ใช้ร่วมกัน —
   แถบหัวหน้ายีนส์ + แถบความคืบหน้า + มาสคอต, แถบข้าง (ขั้นตอน + การ์ดตัวอย่าง) และการ์ดฟอร์มที่มีแถบปุ่มท้ายการ์ด
   แต่ละหน้าส่งแค่ข้อความ/ปุ่มของตัวเอง ส่วนเนื้อหาแต่ละขั้นอยู่ใน section-*.tsx */

export const WIZARD_STEPS: StepMeta[] = [
    { number: 1, title: "ข้อมูลพื้นฐาน", subtitle: "ชื่อและรายละเอียดงาน" },
    { number: 2, title: "กิจกรรมย่อย", subtitle: "รอบ วันเวลา และ Soft Skills" },
    { number: 3, title: "แบบสำรวจ", subtitle: "คำถามหลังจบกิจกรรม" },
    { number: 4, title: "เผยแพร่", subtitle: "ตรวจสอบและยืนยัน" },
]

/** ปุ่มรองเส้นขอบบนพื้นขาว (ยกเลิก/ก่อนหน้า/บันทึกฉบับร่าง) — วงโฟกัสสีกรมท่า เพราะอำพันบนพื้นขาวจางเกินไป */
export const WIZARD_OUTLINE_BUTTON =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-[1.5px] border-denim-field bg-white px-5 text-sm font-semibold text-denim-deep transition-colors hover:border-denim-dash hover:bg-denim-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-denim disabled:pointer-events-none disabled:opacity-60"

/** ปุ่มหลักกรมท่าเข้ม (ถัดไป/สร้างงาน) — ไอคอนอำพันบนพื้นเข้ม */
export const WIZARD_PRIMARY_BUTTON =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-denim-deep px-5 text-sm font-semibold text-white shadow-[0_3px_0_rgb(8_16_31)] transition-[background-color,transform,box-shadow] hover:bg-denim active:translate-y-px active:shadow-[0_2px_0_rgb(8_16_31)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-denim disabled:pointer-events-none disabled:opacity-70"

/* ── แถบหัวหน้า ──────────────────────────────────────────────────────────── */

function WizardHero({
    backHref,
    backLabel,
    prompt,
    title,
    subtitle,
    step,
    event,
    activities,
}: {
    backHref: string
    backLabel: string
    prompt: string
    title: string
    subtitle: React.ReactNode
    step: number
    event: EventFormState
    activities: ActivityFormState[]
}) {
    const progress = stepProgress(step, event, activities)
    const message = mascotMessage(step, progress)
    // ขั้นที่ไม่มีรายการให้นับเลย (แบบสำรวจที่ลบคำถามหมด) ถือว่าเต็ม — ไม่มีอะไรค้างให้ทำ
    const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 100
    const stepTitle = WIZARD_STEPS[step - 1]?.title ?? ""

    return (
        <section className="denim-weave relative overflow-hidden">
            <Container className="relative max-w-6xl pb-9 pt-6 sm:pt-7">
                <div className="flex max-w-2xl flex-col gap-3 lg:max-w-[calc(100%-17rem)]">
                    <Link
                        href={backHref}
                        className="inline-flex w-fit items-center gap-1 rounded text-sm text-denim-on transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
                    >
                        <ChevronLeft className="size-4" aria-hidden="true" />
                        {backLabel}
                    </Link>
                    <TerminalPrompt>{prompt}</TerminalPrompt>
                    <h1 className="font-display text-[34px] font-bold leading-[1.15] tracking-[-0.01em] text-white sm:text-[44px]">{title}</h1>
                    <p className="text-[15px] leading-relaxed text-denim-on sm:text-base">{subtitle}</p>
                    <div className="mt-1 flex items-center gap-3">
                        <div
                            role="progressbar"
                            aria-label={`ความคืบหน้าขั้น${stepTitle}`}
                            aria-valuemin={0}
                            aria-valuemax={progress.total}
                            aria-valuenow={progress.done}
                            className="h-2 w-full max-w-[330px] overflow-hidden rounded-full bg-white/15"
                        >
                            {/* ความกว้างเป็นค่าที่คำนวณตอนรัน — ต้องเป็น inline style (Tailwind สร้างคลาสจากค่าที่ประกอบตอนรันไม่ได้) */}
                            <div className="h-full rounded-full bg-amber transition-[width] duration-300" style={{ width: `${percent}%` }} />
                        </div>
                        <span className="shrink-0 font-code text-xs font-semibold text-white">
                            {progress.slug} {progress.done}/{progress.total}
                        </span>
                    </div>
                    {/* จอแคบไม่มีมาสคอต — ข้อความเดียวกันขึ้นใต้แถบแทน */}
                    <p className="text-sm font-medium text-amber lg:hidden">{message}</p>
                </div>

                {/* มาสคอตยืนบนแถบหมากรุก + บับเบิลบอกว่าเหลืออะไรก่อนไปต่อ — จอ lg+ เท่านั้น (จอแคบกว่านี้ชนหัวข้อ) */}
                <div className="absolute bottom-0 right-10 hidden lg:block xl:right-14">
                    <Image
                        src="/mascot-laptop.png"
                        alt=""
                        width={476}
                        height={1033}
                        sizes="90px"
                        priority
                        className="h-[190px] w-auto drop-shadow-[0_16px_24px_rgb(0_0_0/0.35)]"
                    />
                    <p className="absolute right-[88%] top-[12%] w-max max-w-[230px] rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold leading-snug text-balance text-denim-deep shadow-[0_14px_30px_-14px_rgb(0_0_0/0.5)] after:absolute after:-right-1.5 after:top-4 after:size-3 after:rotate-45 after:bg-white">
                        {message}
                    </p>
                </div>
            </Container>
            <div className="checker-strip h-3.5" aria-hidden="true" />
        </section>
    )
}

/* ── การ์ดตัวอย่างในแถบข้าง ───────────────────────────────────────────────── */

/** ตัวอย่างการ์ดงานแบบย่อ อัปเดตตามที่พิมพ์ — ปก (รูปที่เลือก หรือลายของธีมตามหมวดหมู่ของกิจกรรมแรก) + ป้ายประเภทการรับสมัคร + ชื่อ/คำอธิบาย */
function WizardPreviewCard({ event, activities }: { event: EventFormState; activities: ActivityFormState[] }) {
    const tag = REGISTRATION_TYPE_OPTIONS.find((o) => o.value === event.registrationType)?.tag
    const name = event.name.trim()
    const description = event.description.trim()

    return (
        <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-2">
                <span className="font-code text-xs text-denim-accent" aria-hidden="true">
                    {"// preview.card"}
                </span>
                <span className="text-xs text-denim-muted">นักศึกษาจะเห็นแบบนี้</span>
            </div>
            <div className="overflow-hidden rounded-[20px] border border-denim-line bg-white shadow-[0_14px_30px_-22px_rgb(18_34_61/0.45)]">
                <div className={cn("relative grid h-[118px] place-items-center", coverPattern("open", activities[0]?.categories ?? []))}>
                    {event.imagePreview ? (
                        // eslint-disable-next-line @next/next/no-img-element -- พรีวิวเป็น data URL จากตัวครอปรูป หรือรูปที่อัปโหลดไว้แล้วบน backend
                        <img src={event.imagePreview} alt="" className="absolute inset-0 size-full object-cover" />
                    ) : (
                        <span className="flex flex-col items-center gap-1.5" aria-hidden="true">
                            <Code2 className="size-6 text-amber" />
                            <span className="font-code text-[11px] text-denim-on-muted">cover: none</span>
                        </span>
                    )}
                    {tag && (
                        <span className="absolute left-3 top-3 rounded-full bg-amber px-2.5 py-1 text-[11px] font-semibold text-denim-deep">
                            {tag}
                        </span>
                    )}
                </div>
                <div className="px-4 pb-4 pt-3">
                    <p className="font-code text-[11px] text-denim-muted">{event.type === "single" ? "กิจกรรมเดี่ยว" : "หลายกิจกรรมย่อย"}</p>
                    <p className={cn("mt-1 line-clamp-2 break-words font-display text-base font-bold leading-snug", name ? "text-denim-deep" : "text-denim-accent")}>
                        {name || "ชื่องานจะแสดงตรงนี้"}
                    </p>
                    <p className="mt-1 line-clamp-2 break-words text-xs leading-relaxed text-denim-muted">
                        {description || "คำอธิบายสั้น ๆ ของงานจะแสดงสองบรรทัดแรกบนการ์ด"}
                    </p>
                </div>
            </div>
        </div>
    )
}

/* ── หัวการ์ดแต่ละขั้น + บล็อกเนื้อหา ─────────────────────────────────────── */

/** หัวการ์ดของแต่ละขั้น: คอมเมนต์โค้ด (// step_01 · event.basics) + หัวข้อ + คำอธิบาย + ช่องขวา (หมายเหตุ/ปุ่ม) */
export function WizardSectionHeader({
    step,
    title,
    description,
    aside,
}: {
    step: number
    title: React.ReactNode
    description?: React.ReactNode
    aside?: React.ReactNode
}) {
    return (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 py-6 sm:px-8">
            <div className="min-w-0 flex-1">
                <p className="font-code text-xs text-denim-accent" aria-hidden="true">
                    {`// step_0${step} · event.${stepSlug(step)}`}
                </p>
                <h2 className="mt-1.5 font-display text-[22px] font-bold leading-tight text-denim-deep sm:text-2xl">{title}</h2>
                {description && <p className="mt-1.5 text-sm leading-relaxed text-denim-muted">{description}</p>}
            </div>
            {aside}
        </header>
    )
}

export function WizardRequiredNote() {
    return (
        <p className="shrink-0 text-xs text-denim-muted">
            <span className="text-danger">*</span> จำเป็นต้องกรอก
        </p>
    )
}

/** บล็อกเนื้อหาในการ์ด — การ์ดคั่นแต่ละบล็อกด้วยเส้นประให้เอง (divide-y ที่ WizardShell) */
export function WizardBlock({ className, children }: { className?: string; children: React.ReactNode }) {
    return <div className={cn("px-5 py-6 sm:px-8", className)}>{children}</div>
}

/* ── ปุ่ม/ข้อความในแถบท้ายการ์ด ───────────────────────────────────────────── */

/** "ถัดไป: <ชื่อขั้นถัดไป>" — ขั้นสุดท้ายเปลี่ยนเป็นปุ่มยืนยัน (สร้างงาน/บันทึกการแก้ไข) */
export function WizardNextButton({
    step,
    onNext,
    onFinish,
    finishLabel,
    busy,
    busyLabel,
}: {
    step: number
    onNext: () => void
    onFinish: () => void
    finishLabel: string
    busy: boolean
    busyLabel: string
}) {
    const isLast = step >= WIZARD_STEPS.length
    const next = WIZARD_STEPS[step]
    return (
        <button type="button" onClick={isLast ? onFinish : onNext} disabled={busy} className={WIZARD_PRIMARY_BUTTON}>
            {busy ? (
                <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    {busyLabel}
                </>
            ) : isLast ? (
                <>
                    <Check className="size-4 text-amber" strokeWidth={3} aria-hidden="true" />
                    {finishLabel}
                </>
            ) : (
                <>
                    ถัดไป: {next?.title}
                    <ArrowRight className="size-4 text-amber" aria-hidden="true" />
                </>
            )}
        </button>
    )
}

/** กล่องแจ้งเตือนอำพันเหนือฟอร์ม เช่น "พบฉบับร่าง..." — actions วางปุ่มเองทางขวา */
export function WizardNotice({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
    return (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber/45 bg-amber/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 text-sm leading-relaxed text-amber-ink">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-deep" aria-hidden="true" />
                <div>{children}</div>
            </div>
            {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </div>
    )
}

/* ── โครงทั้งหน้า ─────────────────────────────────────────────────────────── */

interface WizardShellProps {
    backHref: string
    backLabel: string
    prompt: string
    title: string
    subtitle: React.ReactNode
    step: number
    event: EventFormState
    activities: ActivityFormState[]
    /** ข้อความ error ของการกดปุ่มล่าสุด — แสดงในแถบท้ายการ์ด ตรงที่เพิ่งกด */
    error: string
    /** กล่องแจ้งเตือนเหนือฟอร์ม (เช่น เจอฉบับร่างเก่า) */
    notice?: React.ReactNode
    onBack: () => void
    backButtonLabel: string
    /** ปุ่มฝั่งขวาของแถบท้ายการ์ด (บันทึกฉบับร่าง, ถัดไป/ยืนยัน) */
    actions: React.ReactNode
    children: React.ReactNode
}

export function WizardShell({
    backHref,
    backLabel,
    prompt,
    title,
    subtitle,
    step,
    event,
    activities,
    error,
    notice,
    onBack,
    backButtonLabel,
    actions,
    children,
}: WizardShellProps) {
    return (
        <div className="bg-surface pb-16">
            <WizardHero
                backHref={backHref}
                backLabel={backLabel}
                prompt={prompt}
                title={title}
                subtitle={subtitle}
                step={step}
                event={event}
                activities={activities}
            />

            <Container className="max-w-6xl pt-8">
                {notice}

                {/*
                  ทั้งหน้าเลื่อนตามปกติ (การ์ดไม่เลื่อนในตัวเองแล้ว) — แถบข้าง sticky ไว้ให้เห็นขั้นตอน/ตัวอย่างตลอดตอนฟอร์มยาว
                  lg:items-start: ไม่งั้น grid ยืดแถบข้างให้สูงเท่าการ์ด แล้ว sticky ไม่มีระยะให้ขยับ
                */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
                    {/* top-24 เว้นระยะใต้ AppHeader (sticky top-0 h-16) */}
                    <aside className="hidden flex-col gap-6 lg:sticky lg:top-24 lg:flex">
                        <StepperSidebar steps={WIZARD_STEPS} currentStep={step} />
                        <WizardPreviewCard event={event} activities={activities} />
                    </aside>
                    <StepperCompact steps={WIZARD_STEPS} currentStep={step} className="lg:hidden" />

                    <div className="min-w-0 rounded-[24px] border border-denim-line bg-white shadow-[0_18px_40px_-30px_rgb(18_34_61/0.4)]">
                        <div className="divide-y divide-dashed divide-denim-line">{children}</div>

                        <div className="rounded-b-[24px] border-t border-denim-line bg-denim-paper/60 px-5 py-4 sm:px-8">
                            {error && (
                                <p
                                    role="alert"
                                    className="mb-4 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger-bg px-4 py-2.5 text-sm text-danger-fg"
                                >
                                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                    {error}
                                </p>
                            )}
                            {/* จอแคบเรียงแนวตั้ง: ปุ่มหลักอยู่บนสุด ยกเลิก/ก่อนหน้าอยู่ล่างสุด */}
                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <button type="button" onClick={onBack} className={WIZARD_OUTLINE_BUTTON}>
                                    {backButtonLabel}
                                </button>
                                <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center">{actions}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    )
}
