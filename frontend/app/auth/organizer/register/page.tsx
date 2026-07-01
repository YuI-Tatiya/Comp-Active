"use client"

import { useState } from "react"
import Link from "next/link"
import {
    ArrowLeft, CheckCircle2, ClipboardList, Clock, Mail,
    CalendarPlus, ShieldCheck, Zap, Users, Send, Loader2,
} from "lucide-react"
import { organizerRequestsAPI } from "@/lib/api"

const benefits = [
    { icon: CalendarPlus, title: "สร้างและจัดการกิจกรรม", desc: "ระบบดูแลการจัดการกิจกรรมครบวงจรตั้งแต่เริ่มจนจบ" },
    { icon: Users, title: "ระบบจัดการผู้เข้าร่วม", desc: "เช็คอินด้วย QR Code และติดตามสถานะผู้เข้าร่วมเรียลไทม์" },
    { icon: Zap, title: "เครื่องมือวิเคราะห์สถิติ", desc: "ดูข้อมูลเชิงลึกและประสิทธิภาพของกิจกรรมที่คุณจัด" },
    { icon: ShieldCheck, title: "ออกเกียรติบัตรอัตโนมัติ", desc: "ระบบสร้างและแจกจ่ายเกียรติบัตรออนไลน์ให้ผู้ผ่านกิจกรรม" },
]

type FormState = "idle" | "loading" | "success"

function inputCls(error?: string) {
    return `w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors ${
        error ? "border-red-300 focus:ring-red-500 bg-red-50" : "border-slate-200 focus:ring-indigo-500 bg-white"
    }`
}

function Field({ label, required, error, children }: {
    label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
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

    if (state === "success") {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-10 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">ส่งคำขอสำเร็จแล้ว!</h2>
                    <p className="text-slate-500 mb-2 leading-relaxed">ทีมงานจะตรวจสอบข้อมูลและแจ้งผลผ่านทางอีเมล</p>
                    <p className="text-indigo-600 font-semibold mb-8">{form.email}</p>
                    <div className="bg-slate-50 rounded-2xl p-4 mb-8 text-left space-y-3">
                        {[
                            { icon: Clock, text: "รอผล 1-2 วันทำการ" },
                            { icon: Mail, text: "รับอีเมลแจ้งผลพร้อม credentials" },
                            { icon: CheckCircle2, text: "เข้าสู่ระบบและเริ่มสร้างกิจกรรมได้เลย" },
                        ].map(({ icon: Icon, text }) => (
                            <div key={text} className="flex items-center gap-3 text-sm text-slate-600">
                                <Icon className="w-4 h-4 text-indigo-500 shrink-0" />
                                {text}
                            </div>
                        ))}
                    </div>
                    <Link href="/auth/organizer" className="block w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-center">
                        กลับหน้าเข้าสู่ระบบ
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-5xl mx-auto">
                <div className="mb-6">
                    <Link href="/auth/organizer" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
                        <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
                    </Link>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="grid lg:grid-cols-5">

                        {/* Left */}
                        <div className="lg:col-span-2 p-10 bg-gradient-to-br from-indigo-600 to-violet-700 relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 20%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
                            <div className="relative z-10">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider mb-6">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    เปิดรับสมัคร
                                </div>
                                <h1 className="text-3xl font-black text-white mb-4 leading-tight">
                                    สมัครเป็น<br />ผู้จัดกิจกรรม
                                </h1>
                                <p className="text-indigo-200 text-sm leading-relaxed mb-10">
                                    กรอกข้อมูลด้านขวา ทีมงานจะตรวจสอบและแจ้งผลพร้อม credentials ทางอีเมล
                                </p>
                                <div className="space-y-5">
                                    {benefits.map(({ icon: Icon, title, desc }) => (
                                        <div key={title} className="flex gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                                                <Icon className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <div className="text-white font-semibold text-sm">{title}</div>
                                                <div className="text-indigo-300 text-xs leading-relaxed mt-0.5">{desc}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-10 pt-8 border-t border-white/20 space-y-3">
                                    {[
                                        { icon: ClipboardList, text: "กรอกแบบฟอร์ม" },
                                        { icon: Clock, text: "รอการตรวจสอบ 1-2 วันทำการ" },
                                        { icon: Mail, text: "รับ credentials ทางอีเมล" },
                                    ].map(({ icon: Icon, text }) => (
                                        <div key={text} className="flex items-center gap-2.5 text-sm text-indigo-200">
                                            <Icon className="w-4 h-4 text-indigo-300" />
                                            {text}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right — Form */}
                        <div className="lg:col-span-3 p-10">
                            <h2 className="text-xl font-bold text-slate-900 mb-1">กรอกข้อมูลการสมัคร</h2>
                            <p className="text-sm text-slate-500 mb-8">ช่องที่มี <span className="text-red-500">*</span> จำเป็นต้องกรอก</p>

                            <form onSubmit={handleSubmit} className="space-y-5">
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
                                        className={inputCls(errors.reason) + " resize-none"} />
                                    <p className="text-xs text-slate-400 mt-1">{form.reason.length} ตัวอักษร (ขั้นต่ำ 20)</p>
                                </Field>

                                <Field label="ประสบการณ์การจัดกิจกรรม (ถ้ามี)">
                                    <textarea rows={2} placeholder="เคยจัดกิจกรรมอะไรมาบ้าง..."
                                        value={form.experience} onChange={(e) => set("experience", e.target.value)}
                                        className={inputCls() + " resize-none"} />
                                </Field>

                                {serverError && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                                        {serverError}
                                    </div>
                                )}

                                <button type="submit" disabled={state === "loading"}
                                    className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                                    {state === "loading"
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังส่ง...</>
                                        : <><Send className="w-4 h-4" /> ส่งคำขอ</>}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
