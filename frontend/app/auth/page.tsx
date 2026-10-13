"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CalendarPlus, ScanLine, Search, UserPlus } from "lucide-react"
import { LoginForm } from "@/components/auth/login-form"
import { RegisterForm } from "@/components/auth/register-form"
import { AuthBackButton, AuthHeading, AuthMobileBack, AuthShell } from "@/components/auth/auth-shell"
import { cn } from "@/lib/utils"

const STEPS = [
    { icon: Search, title: "ค้นหากิจกรรม", body: "เลือกกิจกรรมที่คุณสนใจจากหลากหลายหมวดหมู่" },
    { icon: UserPlus, title: "ลงทะเบียน", body: "ลงทะเบียนเข้าร่วมกิจกรรมได้ง่าย ๆ ในไม่กี่คลิก" },
    { icon: ScanLine, title: "เข้าร่วมกิจกรรม", body: "แสดง QR Code เพื่อเช็คอินเข้าร่วมกิจกรรม" },
]

/** แผงซ้าย — บรรทัดคำสั่ง login + 3 ขั้นตอน + มาสคอตถือแล็ปท็อปพร้อมคำแนะนำเรื่อง Username ของนักศึกษา */
function LoginAside() {
    return (
        <div className="relative flex min-h-0 flex-1 flex-col px-10 pt-8 xl:px-12">
            <AuthBackButton href="/">กลับไปหน้าหลัก</AuthBackButton>

            <p className="mt-10 font-code text-[28px] leading-tight text-white xl:text-[34px]">
                ~/comp-active ${" "}
                <span className="whitespace-nowrap text-amber">
                    login
                    <span className="term-cursor" aria-hidden="true" />
                </span>
            </p>
            <p className="mt-3 text-[15px] text-denim-on">3 ขั้นตอนจากหน้านี้ไปถึงกิจกรรมแรกของคุณ</p>

            <ol className="relative mt-7 space-y-6">
                {/* เส้นประเชื่อมวงกลมของแต่ละขั้น — จากกลางวงแรกถึงกลางวงสุดท้าย */}
                <span className="absolute bottom-5 left-5 top-5 border-l-2 border-dashed border-amber/50" aria-hidden="true" />
                {STEPS.map(({ icon: Icon, title, body }) => (
                    <li key={title} className="relative flex gap-4">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-amber text-denim-deep">
                            <Icon className="size-[18px]" aria-hidden="true" />
                        </span>
                        <div className="pt-0.5">
                            <h2 className="font-semibold text-white">{title}</h2>
                            <p className="mt-0.5 text-sm text-denim-on">{body}</p>
                        </div>
                    </li>
                ))}
            </ol>

            {/* มาสคอตยืนบนแถบหมากรุก — ความสูงตามพื้นที่ที่เหลือใต้ขั้นตอน (จอเตี้ยย่อลง จอเตี้ยมากซ่อน) ไม่ให้ทับรายการขั้นตอน */}
            <div className="absolute bottom-0 right-8 h-[clamp(170px,calc(100dvh-570px),300px)] [@media(max-height:660px)]:hidden xl:right-12">
                <Image
                    src="/mascot-laptop.png"
                    alt=""
                    width={476}
                    height={1033}
                    sizes="140px"
                    priority
                    className="h-full w-auto drop-shadow-[0_16px_24px_rgb(0_0_0/0.35)]"
                />
                <p className="absolute right-[88%] top-[14%] w-[210px] rounded-2xl bg-white px-4 py-3 text-sm font-semibold leading-snug text-denim-deep shadow-[0_14px_30px_-14px_rgb(0_0_0/0.5)] after:absolute after:-right-1.5 after:top-6 after:size-3 after:rotate-45 after:bg-white">
                    นักศึกษาใช้อีเมล <span className="font-code text-[13px]">@kkumail.com</span> เป็น Username นะ!
                </p>
            </div>
        </div>
    )
}

/** ทางไปหน้าสมัครเป็นผู้จัด — ใต้ฟอร์มเข้าสู่ระบบ */
function OrganizerCta() {
    return (
        <Link
            href="/auth/organizer/register"
            className="group mt-6 flex items-center gap-4 rounded-2xl border-[1.5px] border-dashed border-denim-dash bg-denim-paper/60 p-4 transition-colors hover:border-denim hover:bg-denim-paper focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
        >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-denim-deep text-amber">
                <CalendarPlus className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block font-semibold text-denim-deep">อยากร่วมเป็นผู้สร้างกิจกรรม?</span>
                <span className="block text-sm text-denim-muted">สำหรับชมรม/หน่วยงานที่ต้องการจัดกิจกรรมเอง</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-amber-ink">
                สมัครที่นี่
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
        </Link>
    )
}

const TABS = [
    { key: "login", label: "เข้าสู่ระบบ" },
    { key: "register", label: "ลงทะเบียน" },
] as const

export default function AuthPage() {
    const [activeTab, setActiveTab] = useState<"login" | "register">("login")
    const scrollRef = useRef<HTMLDivElement>(null)

    // สลับแท็บแล้วเด้ง scroll กลับบนสุด ไม่งั้นจะค้างอยู่ตำแหน่งเดิมของฟอร์มก่อนหน้า
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0 })
    }, [activeTab])

    return (
        <AuthShell aside={<LoginAside />}>
            {/* หัว + แท็บอยู่นอกพื้นที่ scroll — แท็บกดได้ตลอดไม่ต้องเลื่อนขึ้นมาหา */}
            <div className="shrink-0 px-6 pt-7 sm:px-10 sm:pt-10">
                <AuthMobileBack href="/">กลับไปหน้าหลัก</AuthMobileBack>
                <AuthHeading comment="auth" title="ยินดีต้อนรับ" subtitle="เข้าสู่ระบบหรือสร้างบัญชีใหม่เพื่อเริ่มใช้งาน" />

                <div role="tablist" aria-label="เข้าสู่ระบบหรือลงทะเบียน" className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-denim-paper p-1.5">
                    {TABS.map((t) => {
                        const active = activeTab === t.key
                        return (
                            <button
                                key={t.key}
                                type="button"
                                role="tab"
                                id={`auth-tab-${t.key}`}
                                aria-selected={active}
                                aria-controls="auth-panel"
                                onClick={() => setActiveTab(t.key)}
                                className={cn(
                                    "min-h-12 rounded-xl text-[15px] font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim",
                                    active
                                        ? "bg-denim-deep text-white shadow-[0_10px_20px_-12px_rgb(18_34_61/0.9)]"
                                        : "text-denim-ink hover:text-denim-deep"
                                )}
                            >
                                {t.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* จุดเดียวในหน้านี้ที่เลื่อนได้ (ฟอร์มลงทะเบียนยาวกว่าการ์ด) */}
            <div
                ref={scrollRef}
                id="auth-panel"
                role="tabpanel"
                aria-labelledby={`auth-tab-${activeTab}`}
                tabIndex={0}
                className={cn("min-h-0 flex-1 overflow-y-auto px-6 pt-6 sm:px-10", activeTab === "login" && "pb-8")}
            >
                {activeTab === "login" ? (
                    <>
                        <LoginForm />
                        <OrganizerCta />
                    </>
                ) : (
                    <RegisterForm />
                )}
            </div>
        </AuthShell>
    )
}
