"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { CalendarPlus, ChartColumn, CheckCircle2, Clock, Loader2, Mail, Medal, ScanLine, Send } from "lucide-react"
import { AMBER_BUTTON } from "@/components/denim/denim-ui"
import { AUTH_INPUT, AuthBackButton, AuthError, AuthHeading, AuthLabel, AuthMobileBack, AuthShell } from "@/components/auth/auth-shell"
import { Input } from "@/components/ui/input"
import { organizerRequestsAPI } from "@/lib/api"
import { cn } from "@/lib/utils"

const BENEFITS = [
    { icon: CalendarPlus, title: "สร้างและจัดการกิจกรรม", desc: "ระบบดูแลการจัดการกิจกรรมครบวงจรตั้งแต่เริ่มจนจบ" },
    { icon: ScanLine, title: "ระบบจัดการผู้เข้าร่วม", desc: "เช็คอินด้วย QR Code และติดตามสถานะผู้เข้าร่วมเรียลไทม์" },
    { icon: ChartColumn, title: "เครื่องมือวิเคราะห์สถิติ", desc: "ดูข้อมูลเชิงลึกและประสิทธิภาพของกิจกรรมที่คุณจัด" },
    { icon: Medal, title: "ออกเกียรติบัตรอัตโนมัติ", desc: "ระบบสร้างและแจกจ่ายเกียรติบัตรออนไลน์ให้ผู้ผ่านกิจกรรม" },
]

/** ความยาวขั้นต่ำของเหตุผล — ต้องตรงกับที่ validate() เช็ค */
const REASON_MIN = 20

type FormState = "idle" | "loading" | "success"

/** แผงซ้าย — กรอบเส้นประอำพัน: หัวเรื่อง, ประโยชน์ 4 ข้อ, ขั้นตอนหลังส่งคำขอ และมาสคอตโบกมือ
 *  การ์ดสูงคงที่เท่าหน้า login (scroll="inner") — เนื้อหาฝั่งนี้ยาวกว่า LoginAside จึงเลื่อนได้เองถ้าจอเตี้ย
 *  (แถบย้อนกลับ/ป้ายสถานะอยู่นอกส่วนเลื่อน มาสคอตอยู่ในส่วนเลื่อนท้ายสุด — ปักไว้นอกส่วนเลื่อนแล้วมันจะทับเนื้อหาด้านบนตอนเลื่อนยังไม่สุด) */
function ApplyAside() {
    return (
        <div className="relative m-5 flex min-h-0 flex-1 flex-col rounded-[22px] border-2 border-dashed border-amber/50 xl:m-6">
            <div className="flex shrink-0 items-center justify-between gap-3 px-7 pt-7 xl:px-8">
                <AuthBackButton href="/auth">ย้อนกลับ</AuthBackButton>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber px-3.5 py-1.5 text-xs font-semibold text-denim-deep">
                    <span className="size-[7px] rounded-full bg-denim-deep" aria-hidden="true" />
                    เปิดรับสมัคร
                </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-0 xl:px-8">
                <p className="mt-7 font-code text-sm text-denim-on-muted">$ sudo apply --role=organizer</p>
                <h1 className="mt-2 font-display text-4xl font-bold leading-[1.2] text-white xl:text-[44px]">
                    สมัครเป็น<span className="text-amber">ผู้จัดกิจกรรม</span>
                </h1>
                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-denim-on">
                    กรอกข้อมูลด้านขวา ทีมงานจะตรวจสอบและแจ้งผลพร้อม credentials ทางอีเมล
                </p>

                <ul className="mt-7 grid grid-cols-2 gap-3">
                    {BENEFITS.map(({ icon: Icon, title, desc }) => (
                        <li key={title} className="rounded-2xl border border-white/15 bg-white/[0.06] p-4">
                            <span className="grid size-9 place-items-center rounded-lg bg-amber text-denim-deep">
                                <Icon className="size-[18px]" aria-hidden="true" />
                            </span>
                            <p className="mt-3 text-[15px] font-semibold text-white">{title}</p>
                            <p className="mt-1 text-[13px] leading-relaxed text-denim-on">{desc}</p>
                        </li>
                    ))}
                </ul>

                {/* ขั้นตอนหลังส่ง — ขั้นแรก (กำลังทำอยู่) เป็นวงขาว ที่เหลือวงเข้ม เชื่อมด้วยเส้นประ */}
                <ol className="relative mt-7 space-y-5" aria-label="ขั้นตอนการสมัคร">
                    <span className="absolute bottom-4 left-4 top-4 border-l-2 border-dashed border-amber/40" aria-hidden="true" />
                    {[
                        { n: "01", text: <>กรอกแบบฟอร์ม</>, current: true },
                        { n: "02", text: <>รอการตรวจสอบ <span className="text-amber">1–2 วันทำการ</span></> },
                        { n: "03", text: <>รับ credentials ทางอีเมล</> },
                    ].map(({ n, text, current }) => (
                        <li key={n} className="relative flex items-center gap-4" aria-current={current ? "step" : undefined}>
                            <span
                                className={cn(
                                    "grid size-8 shrink-0 place-items-center rounded-full font-code text-xs font-semibold",
                                    current ? "bg-white text-denim-deep" : "border border-white/25 bg-denim-deep text-denim-on"
                                )}
                            >
                                {n}
                            </span>
                            <span className="font-semibold text-white">{text}</span>
                        </li>
                    ))}
                </ol>

                <Image
                    src="/mascot-wave.png"
                    alt=""
                    width={421}
                    height={900}
                    sizes="110px"
                    className="-mb-2 ml-1 mt-6 h-48 w-auto drop-shadow-[0_16px_24px_rgb(0_0_0/0.35)]"
                />
            </div>
        </div>
    )
}

export default function OrganizerRegisterPage() {
    const [form, setForm] = useState({ name: "", email: "", phone: "", department: "", reason: "", experience: "" })
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [state, setState] = useState<FormState>("idle")
    const [serverError, setServerError] = useState("")

    function set(field: string, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }))
        setErrors((prev) => ({ ...prev, [field]: "" }))
    }

    function validate() {
        const e: Record<string, string> = {}
        if (!form.name.trim()) e.name = "กรุณากรอกชื่อ-นามสกุล"
        if (!form.email.trim()) e.email = "กรุณากรอกอีเมล"
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "รูปแบบอีเมลไม่ถูกต้อง"
        if (!form.phone.trim()) e.phone = "กรุณากรอกเบอร์โทรศัพท์"
        if (!form.department.trim()) e.department = "กรุณากรอกสังกัด/หน่วยงาน"
        if (!form.reason.trim()) e.reason = "กรุณากรอกเหตุผล"
        else if (form.reason.trim().length < REASON_MIN) e.reason = `กรุณากรอกเหตุผลอย่างน้อย ${REASON_MIN} ตัวอักษร`
        return e
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length > 0) {
            setErrors(errs)
            return
        }
        setState("loading")
        setServerError("")
        try {
            await organizerRequestsAPI.submit({
                name: form.name.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                department: form.department.trim(),
                reason: form.reason.trim(),
                experience: form.experience.trim() || undefined,
            })
            setState("success")
        } catch (err) {
            setServerError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่")
            setState("idle")
        }
    }

    // ── ส่งสำเร็จ ─────────────────────────────────────────────────────────────
    if (state === "success") {
        return (
            <div className="flex min-h-dvh items-center justify-center bg-surface p-4">
                <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-denim-line bg-white shadow-[0_30px_80px_-40px_rgb(18_34_61/0.55)]">
                    <div className="denim-weave px-8 pb-8 pt-9 text-center text-white">
                        <span className="mx-auto grid size-14 place-items-center rounded-full bg-amber text-denim-deep">
                            <CheckCircle2 className="size-7" aria-hidden="true" />
                        </span>
                        <p className="mt-5 font-code text-xs text-denim-on-muted">$ sudo apply --role=organizer · sent</p>
                        <h1 className="mt-1.5 font-display text-2xl font-bold">ส่งคำขอสำเร็จแล้ว</h1>
                        <p className="mt-2 text-sm leading-relaxed text-denim-on">ทีมงานจะตรวจสอบข้อมูลและแจ้งผลผ่านทางอีเมล</p>
                        <p className="mt-1 break-all text-sm font-semibold text-amber">{form.email}</p>
                    </div>
                    <div className="checker-strip h-3" aria-hidden="true" />
                    <div className="p-7">
                        <ul className="space-y-3 rounded-2xl bg-denim-paper p-4">
                            {[
                                { icon: Clock, text: "รอผล 1–2 วันทำการ" },
                                { icon: Mail, text: "รับอีเมลแจ้งผลพร้อม credentials" },
                                { icon: CheckCircle2, text: "เข้าสู่ระบบและเริ่มสร้างกิจกรรมได้เลย" },
                            ].map(({ icon: Icon, text }) => (
                                <li key={text} className="flex items-center gap-3 text-sm text-denim-ink">
                                    <Icon className="size-4 shrink-0 text-denim" aria-hidden="true" />
                                    {text}
                                </li>
                            ))}
                        </ul>
                        <Link href="/auth" className={cn(AMBER_BUTTON, "mt-6 w-full")}>
                            กลับหน้าเข้าสู่ระบบ
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const requiredDone = [
        form.name.trim(),
        form.email.trim(),
        form.phone.trim(),
        form.department.trim(),
        form.reason.trim().length >= REASON_MIN ? "ok" : "",
    ].filter(Boolean).length
    const reasonLength = form.reason.trim().length
    const reasonPct = Math.min(100, (reasonLength / REASON_MIN) * 100)

    const fieldProps = (field: keyof typeof form) => ({
        id: `org-${field}`,
        value: form[field],
        "aria-invalid": errors[field] ? true : undefined,
        "aria-describedby": errors[field] ? `org-${field}-error` : undefined,
    })
    const fieldError = (field: string) =>
        errors[field] ? (
            <p id={`org-${field}-error`} className="mt-1.5 text-xs font-medium text-red-700">
                {errors[field]}
            </p>
        ) : null

    return (
        <AuthShell aside={<ApplyAside />} scroll="inner" asideRatio="narrow">
            <div className="shrink-0 border-b border-denim-line px-6 pb-5 pt-7 sm:px-10 sm:pt-10">
                <AuthMobileBack href="/auth">ย้อนกลับ</AuthMobileBack>
                <AuthHeading
                    comment="application.form"
                    title="กรอกข้อมูลการสมัคร"
                    subtitle={
                        <>
                            ช่องที่มี <span className="text-red-600">*</span> จำเป็นต้องกรอก
                        </>
                    }
                    right={
                        <p className="font-code text-sm text-denim-muted" aria-label={`กรอกช่องบังคับแล้ว ${requiredDone} จาก 5`}>
                            required: <strong className={cn("font-semibold", requiredDone === 5 ? "text-emerald-700" : "text-denim-deep")}>{requiredDone}/5</strong>
                        </p>
                    }
                />
            </div>

            {/* ฟอร์มยาวกว่าการ์ด (scroll="inner" สูงคงที่เท่าหน้า login) — เลื่อนเฉพาะกลุ่มช่องกรอก ปุ่มส่งอยู่นอกส่วนเลื่อนเสมอ */}
            <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto">
                    <div className="grid gap-x-6 gap-y-5 px-6 py-7 sm:grid-cols-2 sm:px-10">
                        <div>
                            <AuthLabel htmlFor="org-name" required>ชื่อ-นามสกุล</AuthLabel>
                            <Input {...fieldProps("name")} autoComplete="name" placeholder="สมชาย ใจดี" onChange={(e) => set("name", e.target.value)} className={AUTH_INPUT} />
                            {fieldError("name")}
                        </div>
                        <div>
                            <AuthLabel htmlFor="org-email" required>อีเมล</AuthLabel>
                            <Input {...fieldProps("email")} type="email" autoComplete="email" placeholder="example@kkumail.com" onChange={(e) => set("email", e.target.value)} className={AUTH_INPUT} />
                            {fieldError("email")}
                        </div>
                        <div>
                            <AuthLabel htmlFor="org-phone" required>เบอร์โทรศัพท์</AuthLabel>
                            <Input {...fieldProps("phone")} type="tel" autoComplete="tel" placeholder="0812345678" onChange={(e) => set("phone", e.target.value)} className={AUTH_INPUT} />
                            {fieldError("phone")}
                        </div>
                        <div>
                            <AuthLabel htmlFor="org-department" required>สังกัด / หน่วยงาน</AuthLabel>
                            <Input {...fieldProps("department")} autoComplete="organization" placeholder="สโมสรนักศึกษาวิทยาลัยการคอมพิวเตอร์" onChange={(e) => set("department", e.target.value)} className={AUTH_INPUT} />
                            {fieldError("department")}
                        </div>

                        <div className="sm:col-span-2">
                            <AuthLabel htmlFor="org-reason" required>เหตุผลที่ต้องการเป็น Organizer</AuthLabel>
                            <textarea
                                {...fieldProps("reason")}
                                rows={4}
                                placeholder="อธิบายวัตถุประสงค์และประเภทกิจกรรมที่ต้องการจัด..."
                                onChange={(e) => set("reason", e.target.value)}
                                className={cn(AUTH_INPUT, "h-auto min-h-32 w-full resize-y py-3 leading-relaxed")}
                            />
                            <div className="mt-2 flex items-center justify-end gap-3">
                                <span className="h-1.5 w-24 overflow-hidden rounded-full bg-denim-chip" aria-hidden="true">
                                    <span
                                        className={cn("block h-full rounded-full transition-[width] duration-300", reasonPct >= 100 ? "bg-emerald-600" : "bg-amber")}
                                        style={{ width: `${reasonPct}%` }}
                                    />
                                </span>
                                <span className={cn("font-code text-xs", reasonPct >= 100 ? "text-emerald-700" : "text-denim-muted")}>
                                    {reasonLength} ตัวอักษร (ขั้นต่ำ {REASON_MIN})
                                </span>
                            </div>
                            {fieldError("reason")}
                        </div>

                        <div className="sm:col-span-2">
                            <AuthLabel htmlFor="org-experience">
                                ประสบการณ์การจัดกิจกรรม <span className="font-normal text-denim-muted">(ถ้ามี)</span>
                            </AuthLabel>
                            <textarea
                                {...fieldProps("experience")}
                                rows={3}
                                placeholder="[ตัวอย่างกิจกรรมที่เคยจัด]"
                                onChange={(e) => set("experience", e.target.value)}
                                className={cn(AUTH_INPUT, "h-auto min-h-28 w-full resize-y py-3 leading-relaxed")}
                            />
                        </div>

                        {serverError && (
                            <div className="sm:col-span-2">
                                <AuthError>{serverError}</AuthError>
                            </div>
                        )}
                    </div>
                </div>

                <div className="shrink-0 border-t border-denim-line px-6 py-6 sm:px-10">
                    <button type="submit" disabled={state === "loading"} className={cn(AMBER_BUTTON, "w-full disabled:cursor-wait disabled:opacity-80")}>
                        {state === "loading" ? (
                            <>
                                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                                กำลังส่ง...
                            </>
                        ) : (
                            <>
                                <Send className="size-5" aria-hidden="true" />
                                ส่งคำขอ
                            </>
                        )}
                    </button>
                </div>
            </form>
        </AuthShell>
    )
}
