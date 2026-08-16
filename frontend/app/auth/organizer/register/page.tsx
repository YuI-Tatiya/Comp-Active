"use client"

import { useState } from "react"
import Link from "next/link"
import {
    ArrowLeft, CheckCircle2, ClipboardList, Clock, Mail,
    CalendarPlus, ShieldCheck, Zap, Users, Send, Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { organizerRequestsAPI } from "@/lib/api"
import { cn } from "@/lib/utils"

const benefits = [
    { icon: CalendarPlus, title: "สร้างและจัดการกิจกรรม", desc: "ระบบดูแลการจัดการกิจกรรมครบวงจรตั้งแต่เริ่มจนจบ" },
    { icon: Users, title: "ระบบจัดการผู้เข้าร่วม", desc: "เช็คอินด้วย QR Code และติดตามสถานะผู้เข้าร่วมเรียลไทม์" },
    { icon: Zap, title: "เครื่องมือวิเคราะห์สถิติ", desc: "ดูข้อมูลเชิงลึกและประสิทธิภาพของกิจกรรมที่คุณจัด" },
    { icon: ShieldCheck, title: "ออกเกียรติบัตรอัตโนมัติ", desc: "ระบบสร้างและแจกจ่ายเกียรติบัตรออนไลน์ให้ผู้ผ่านกิจกรรม" },
]

const steps = [
    { icon: ClipboardList, text: "กรอกแบบฟอร์ม" },
    { icon: Clock, text: "รอการตรวจสอบ 1-2 วันทำการ" },
    { icon: Mail, text: "รับ credentials ทางอีเมล" },
]

type FormState = "idle" | "loading" | "success"

function inputCls(error?: string) {
    return cn(
        "w-full rounded-md border bg-bg px-3 py-2.5 text-sm text-fg transition-colors placeholder:text-fg-subtle",
        error ? "border-danger" : "border-border hover:border-border-strong"
    )
}

function Field({ label, required, error, children }: {
    label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-fg">
                {label} {required && <span className="text-danger">*</span>}
            </label>
            {children}
            {error && <p className="mt-1 text-xs text-danger">{error}</p>}
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
        else if (form.reason.trim().length < 20) e.reason = "กรุณากรอกเหตุผลอย่างน้อย 20 ตัวอักษร"
        return e
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length > 0) { setErrors(errs); return }
        setState("loading")
        setServerError("")
        try {
            await organizerRequestsAPI.submit({
                name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(),
                department: form.department.trim(), reason: form.reason.trim(),
                experience: form.experience.trim() || undefined,
            })
            setState("success")
        } catch (err) {
            setServerError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่")
            setState("idle")
        }
    }

    // ── หน้า success — ล็อกความสูงเหมือนกัน ไม่ให้หน้าเลื่อน ──────────────────
    if (state === "success") {
        return (
            <div className="flex h-dvh items-center justify-center overflow-hidden bg-surface p-4">
                <div className="w-full max-w-md rounded-xl border border-border bg-bg p-8 text-center shadow-xs">
                    <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-success-bg">
                        <CheckCircle2 className="size-7 text-success" aria-hidden="true" />
                    </span>
                    <h1 className="text-xl font-semibold text-fg">ส่งคำขอสำเร็จแล้ว</h1>
                    <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                        ทีมงานจะตรวจสอบข้อมูลและแจ้งผลผ่านทางอีเมล
                    </p>
                    <p className="mt-1 text-sm font-medium text-brand-600">{form.email}</p>

                    <ul className="mt-6 space-y-3 rounded-lg border border-border bg-surface p-4 text-left">
                        {[
                            { icon: Clock, text: "รอผล 1-2 วันทำการ" },
                            { icon: Mail, text: "รับอีเมลแจ้งผลพร้อม credentials" },
                            { icon: CheckCircle2, text: "เข้าสู่ระบบและเริ่มสร้างกิจกรรมได้เลย" },
                        ].map(({ icon: Icon, text }) => (
                            <li key={text} className="flex items-center gap-3 text-sm text-fg-muted">
                                <Icon className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                                {text}
                            </li>
                        ))}
                    </ul>

                    <Button size="lg" asChild className="mt-6 w-full">
                        <Link href="/auth">กลับหน้าเข้าสู่ระบบ</Link>
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-dvh items-center justify-center overflow-hidden bg-surface p-4">
            <div className="grid h-[calc(100dvh-2rem)] max-h-[720px] w-full max-w-5xl overflow-hidden rounded-xl border border-border bg-bg shadow-md lg:grid-cols-5">
                {/* ── แผงซ้าย ─────────────────────────────────────────────── */}
                <aside className="hidden flex-col overflow-hidden bg-gradient-to-br from-brand-100 to-brand-500 text-white lg:col-span-2 lg:flex">
                    <div className="shrink-0 px-8 pt-10">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                            <span className="size-1.5 rounded-full bg-white" aria-hidden="true" />
                            เปิดรับสมัคร
                        </span>
                        <h1 className="mt-5 text-2xl font-semibold leading-tight">
                            สมัครเป็นผู้จัดกิจกรรม
                        </h1>
                        <p className="mt-2 text-sm leading-relaxed text-white/90">
                            กรอกข้อมูลด้านขวา ทีมงานจะตรวจสอบและแจ้งผลพร้อม credentials ทางอีเมล
                        </p>
                    </div>

                    <ul className="flex-1 space-y-5 overflow-y-auto px-8 py-8">
                        {benefits.map(({ icon: Icon, title, desc }) => (
                            <li key={title} className="flex gap-3">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                                    <Icon className="size-4" aria-hidden="true" />
                                </span>
                                <div>
                                    <p className="text-sm font-medium">{title}</p>
                                    <p className="mt-0.5 text-xs leading-relaxed text-white/90">{desc}</p>
                                </div>
                            </li>
                        ))}

                        <li className="border-t border-white/20 pt-5">
                            <ul className="space-y-2.5">
                                {steps.map(({ icon: Icon, text }) => (
                                    <li key={text} className="flex items-center gap-2.5 text-sm text-white/90">
                                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                                        {text}
                                    </li>
                                ))}
                            </ul>
                        </li>
                    </ul>

                    <div className="shrink-0 border-t border-white/15 px-8 py-5">
                        <Link
                            href="/auth"
                            className="inline-flex items-center gap-2 text-sm text-white/90 transition-colors hover:text-white"
                        >
                            <ArrowLeft className="size-4" aria-hidden="true" />
                            ย้อนกลับ
                        </Link>
                    </div>
                </aside>

                {/* ── คอลัมน์ฟอร์ม ────────────────────────────────────────── */}
                <main className="flex flex-col overflow-hidden bg-bg lg:col-span-3">
                    <div className="shrink-0 border-b border-border px-6 pt-8 pb-5 sm:px-8">
                        {/* บนมือถือแผงซ้ายถูกซ่อน จึงต้องมีทางย้อนกลับตรงนี้ */}
                        <Link
                            href="/auth"
                            className="mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg lg:hidden"
                        >
                            <ArrowLeft className="size-4" aria-hidden="true" />
                            ย้อนกลับ
                        </Link>
                        <h2 className="text-xl font-semibold tracking-tight text-fg">กรอกข้อมูลการสมัคร</h2>
                        <p className="mt-1 text-sm text-fg-muted">
                            ช่องที่มี <span className="text-danger">*</span> จำเป็นต้องกรอก
                        </p>
                    </div>

                    {/* ⬇️ จุดเดียวในหน้านี้ที่เลื่อนได้ */}
                    {/* ไม่ใส่ pb — ปล่อยให้แถบปุ่ม sticky เป็นตัวปิดขอบล่างเอง */}
                    <div tabIndex={0} className="flex-1 overflow-y-auto px-6 pt-6 sm:px-8">
                        <form onSubmit={handleSubmit} className="flex min-h-full flex-col gap-5">
                            <Field label="ชื่อ-นามสกุล" required error={errors.name}>
                                <input type="text" placeholder="สมชาย ใจดี" value={form.name}
                                    onChange={(e) => set("name", e.target.value)} className={inputCls(errors.name)} />
                            </Field>

                            <Field label="อีเมล" required error={errors.email}>
                                <input type="email" placeholder="example@kkumail.com" value={form.email}
                                    onChange={(e) => set("email", e.target.value)} className={inputCls(errors.email)} />
                            </Field>

                            <Field label="เบอร์โทรศัพท์" required error={errors.phone}>
                                <input type="tel" placeholder="0812345678" value={form.phone}
                                    onChange={(e) => set("phone", e.target.value)} className={inputCls(errors.phone)} />
                            </Field>

                            <Field label="สังกัด / หน่วยงาน" required error={errors.department}>
                                <input type="text" placeholder="สโมสรนักศึกษาวิทยาลัยการคอมพิวเตอร์" value={form.department}
                                    onChange={(e) => set("department", e.target.value)} className={inputCls(errors.department)} />
                            </Field>

                            <Field label="เหตุผลที่ต้องการเป็น Organizer" required error={errors.reason}>
                                <textarea rows={3} placeholder="อธิบายวัตถุประสงค์และประเภทกิจกรรมที่ต้องการจัด..."
                                    value={form.reason} onChange={(e) => set("reason", e.target.value)}
                                    className={cn(inputCls(errors.reason), "resize-none")} />
                                <p className="mt-1 text-xs text-fg-subtle">{form.reason.length} ตัวอักษร (ขั้นต่ำ 20)</p>
                            </Field>

                            <Field label="ประสบการณ์การจัดกิจกรรม (ถ้ามี)">
                                <textarea rows={2} placeholder="เคยจัดกิจกรรมอะไรมาบ้าง..."
                                    value={form.experience} onChange={(e) => set("experience", e.target.value)}
                                    className={cn(inputCls(), "resize-none")} />
                            </Field>

                            {serverError && (
                                <div
                                    role="alert"
                                    className="rounded-lg border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger"
                                >
                                    {serverError}
                                </div>
                            )}

                            {/* ปุ่มลอยติดก้นกรอบ ไม่ต้องเลื่อนหา */}
                            <div className="sticky bottom-0 -mx-6 mt-auto border-t border-border bg-bg px-6 py-4 sm:-mx-8 sm:px-8">
                                <Button type="submit" size="lg" className="w-full" disabled={state === "loading"}>
                                    {state === "loading" ? (
                                        <>
                                            <Loader2 className="animate-spin" />
                                            กำลังส่ง...
                                        </>
                                    ) : (
                                        <>
                                            <Send />
                                            ส่งคำขอ
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    )
}
