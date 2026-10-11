"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"
import { RegisterForm } from "@/components/auth/register-form"
import {
    Search,
    UserPlus,
    QrCode,
    CalendarPlus,
    ArrowLeft,
    AtSign,
} from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = [
    {
        icon: Search,
        title: "ค้นหากิจกรรม",
        body: <>เลือกกิจกรรมที่คุณสนใจจากหลากหลายหมวดหมู่</>,
    },
    {
        icon: UserPlus,
        title: "ลงทะเบียน",
        body: <>ลงทะเบียนเข้าร่วมกิจกรรมได้ง่าย ๆ ในไม่กี่คลิก</>,
    },
    {
        icon: QrCode,
        title: "เข้าร่วมกิจกรรม",
        body: <>แสดง QR Code เพื่อเช็คอินเข้าร่วมกิจกรรม</>,
    },
    {
        icon: AtSign,
        title: "เข้าสู่ระบบแบบนักศึกษา",
        body: (
            <>
                ที่ช่อง <span className="font-semibold text-white">Username</span> ให้กรอกอีเมล
                <span className="font-semibold text-white"> @kkumail.com</span> ของคุณ
            </>
        ),
    },
    {
        icon: CalendarPlus,
        title: "อยากร่วมเป็นผู้สร้างกิจกรรม?",
        divider: true,
        body: (
            <>
                สำหรับชมรม/หน่วยงานที่ต้องการจัดกิจกรรมเอง{" "}
                <Link
                    href="/auth/organizer/register"
                    className="font-semibold text-amber underline underline-offset-4 hover:text-white"
                >
                    สมัครที่นี่
                </Link>
            </>
        ),
    },
]

export default function AuthPage() {
    const [activeTab, setActiveTab] = useState<"login" | "register">("login")
    const scrollRef = useRef<HTMLDivElement>(null)

    // สลับแท็บแล้วเด้ง scroll กลับบนสุด ไม่งั้นจะค้างอยู่ตำแหน่งเดิมของฟอร์มก่อนหน้า
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0 })
    }, [activeTab])

    return (
        // h-dvh + overflow-hidden = หน้าไม่มีวันเกิด scrollbar ของเบราว์เซอร์
        <div className="flex h-dvh items-center justify-center overflow-hidden bg-surface p-4">
            {/* ความสูงคงที่ — ไม่ยืดตามเนื้อหา จึงไม่ขยับเวลาสลับแท็บ */}
            <div className="grid h-[calc(100dvh-2rem)] max-h-[720px] w-full max-w-5xl overflow-hidden rounded-xl border border-border bg-bg shadow-md lg:grid-cols-2">
                {/* ── แผงซ้าย ─────────────────────────────────────────────── */}
                <aside className="denim-weave hidden flex-col overflow-hidden text-white lg:flex">
                    <p className="px-10 pt-8 font-code text-sm text-denim-on-muted">
                        ~/comp-active $ login
                        <span className="term-cursor" aria-hidden="true" />
                    </p>
                    <ol className="flex flex-1 flex-col justify-center space-y-6 overflow-y-auto px-10 py-8">
                        {STEPS.map((step, i) => (
                            <li
                                key={step.title}
                                className={cn(
                                    "flex gap-4",
                                    step.divider && "border-t border-dashed border-amber/40 pt-6"
                                )}
                            >
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber font-display text-sm font-bold text-denim-deep">
                                    {i + 1}
                                </span>
                                <div>
                                    <h2 className="flex items-center gap-2 text-base font-bold text-white">
                                        <step.icon className="size-4" aria-hidden="true" />
                                        {step.title}
                                    </h2>
                                    <p className="mt-1 text-sm leading-relaxed text-denim-on">
                                        {step.body}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ol>

                    <div className="checker-strip h-3.5 shrink-0" aria-hidden="true" />
                    <div className="shrink-0 px-10 py-5">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-sm text-denim-on transition-colors hover:text-white"
                        >
                            <ArrowLeft className="size-4" aria-hidden="true" />
                            กลับไปหน้าหลัก
                        </Link>
                    </div>
                </aside>

                {/* ── คอลัมน์ฟอร์ม ────────────────────────────────────────── */}
                <main className="flex flex-col overflow-hidden bg-bg">
                    {/* header อยู่นอกพื้นที่ scroll — แท็บจึงกดได้ตลอดไม่ต้องเลื่อนขึ้นมาหา */}
                    <div className="shrink-0 border-b border-border px-6 pt-8 pb-5 sm:px-8">
                        <h2 className="text-xl font-semibold tracking-tight text-fg">ยินดีต้อนรับ</h2>
                        <p className="mt-1 text-sm text-fg-muted">
                            เข้าสู่ระบบหรือสร้างบัญชีใหม่เพื่อเริ่มใช้งาน
                        </p>

                        <div role="tablist" className="mt-5 flex gap-1 rounded-lg bg-surface-2 p-1">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeTab === "login"}
                                onClick={() => setActiveTab("login")}
                                className={cn(
                                    "flex-1 rounded-md py-2 text-sm transition-colors",
                                    activeTab === "login"
                                        ? "bg-denim font-semibold text-white shadow-xs"
                                        : "text-fg-muted hover:text-fg"
                                )}
                            >
                                เข้าสู่ระบบ
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeTab === "register"}
                                onClick={() => setActiveTab("register")}
                                className={cn(
                                    "flex-1 rounded-md py-2 text-sm transition-colors",
                                    activeTab === "register"
                                        ? "bg-denim font-semibold text-white shadow-xs"
                                        : "text-fg-muted hover:text-fg"
                                )}
                            >
                                ลงทะเบียน
                            </button>
                        </div>
                    </div>

                    {/* ⬇️ จุดเดียวในหน้านี้ที่เลื่อนได้ */}
                    <div
                        ref={scrollRef}
                        tabIndex={0}
                        // ไม่ใส่ pb — ปล่อยให้แถบปุ่ม sticky เป็นตัวปิดขอบล่างเอง
                        // ถ้ามี pb ปุ่มจะลอยเหนือขอบล่างเท่ากับค่า padding
                        className="flex-1 overflow-y-auto px-6 pt-6 sm:px-8"
                    >
                        {activeTab === "login" ? <LoginForm /> : <RegisterForm />}
                    </div>
                </main>
            </div>
        </div>
    )
}
