"use client"

import { forwardRef, useState } from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowLeft, Eye, EyeOff, Lock } from "lucide-react"
import { Input, type InputProps } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/* โครงหน้า auth ธีม Denim Varsity (เข้าสู่ระบบ/ลงทะเบียน และสมัครเป็นผู้จัด) — การ์ดสองแผง: ซ้ายพื้นยีนส์ + แถบหมากรุก
   ขวาพื้นขาวสำหรับฟอร์ม แผงซ้ายซ่อนบนจอ < lg (ฟอร์มต้องมาก่อนบนมือถือ) แต่ละหน้าใส่ทางกลับเองในฝั่งฟอร์มแทน */

interface AuthShellProps {
    aside: React.ReactNode
    children: React.ReactNode
    /**
     * inner = การ์ดสูงคงที่พอดีจอ เลื่อนเฉพาะในฝั่งฟอร์ม (หน้าเข้าสู่ระบบ: สลับแท็บแล้วการ์ดไม่ยืด-หด)
     * page = การ์ดสูงตามเนื้อหา หน้าเลื่อนตามปกติ (หน้าสมัครผู้จัด เนื้อหาแผงซ้ายยาวกว่าหนึ่งจอ)
     */
    scroll?: "inner" | "page"
    /** สัดส่วนแผงซ้าย: half ≈ ครึ่ง/ครึ่ง, narrow = แผงซ้ายแคบกว่าฟอร์ม */
    asideRatio?: "half" | "narrow"
}

export function AuthShell({ aside, children, scroll = "inner", asideRatio = "half" }: AuthShellProps) {
    return (
        <div
            className={cn(
                "flex justify-center bg-surface p-4 sm:p-6",
                scroll === "inner" ? "h-dvh items-center overflow-hidden" : "min-h-dvh items-start lg:items-center"
            )}
        >
            <div
                className={cn(
                    "grid w-full max-w-[1320px] overflow-hidden rounded-[28px] border border-denim-line bg-white shadow-[0_30px_80px_-40px_rgb(18_34_61/0.55)]",
                    scroll === "inner" && "h-[calc(100dvh-2rem)] max-h-[780px] sm:h-[calc(100dvh-3rem)]",
                    asideRatio === "half" ? "lg:grid-cols-[minmax(0,1.04fr)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)]"
                )}
            >
                <aside className="denim-weave relative hidden min-h-0 flex-col overflow-hidden text-white lg:flex">
                    {aside}
                    <div className="checker-strip relative h-3.5 shrink-0" aria-hidden="true" />
                </aside>
                <main className="flex min-h-0 flex-col bg-white">{children}</main>
            </div>
        </div>
    )
}

/** ปุ่มย้อนกลับเส้นขอบขาวบนแผงยีนส์ */
export function AuthBackButton({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl border-[1.5px] border-white/40 px-4 text-sm font-semibold text-white transition-colors hover:border-white/70 hover:bg-white/10 focus-visible:outline-white"
        >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {children}
        </Link>
    )
}

/** ทางกลับฝั่งฟอร์ม — มือถือเท่านั้น (แผงซ้ายที่มีปุ่มย้อนกลับถูกซ่อน) */
export function AuthMobileBack({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="mb-5 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-denim-muted transition-colors hover:text-denim-deep lg:hidden"
        >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {children}
        </Link>
    )
}

/** หัวฝั่งฟอร์ม: คอมเมนต์โค้ด + h1 + คำอธิบาย + ช่องขวา (เช่น ตัวนับช่องบังคับ) */
export function AuthHeading({
    comment,
    title,
    subtitle,
    right,
}: {
    comment: string
    title: string
    subtitle?: React.ReactNode
    right?: React.ReactNode
}) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
                <p className="font-code text-xs text-denim-accent" aria-hidden="true">
                    {`// ${comment}`}
                </p>
                <h1 className="mt-1 pt-0.5 font-display text-3xl font-bold leading-[1.2] text-denim-deep sm:text-[34px]">{title}</h1>
                {subtitle && <p className="mt-1.5 text-sm text-denim-muted sm:text-[15px]">{subtitle}</p>}
            </div>
            {right}
        </div>
    )
}

/** ป้ายช่องกรอก — * สีแดงเมื่อบังคับ */
export function AuthLabel({ htmlFor, required, children }: { htmlFor: string; required?: boolean; children: React.ReactNode }) {
    return (
        <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-denim-deep">
            {children}
            {required && (
                <span className="ml-1 text-red-600" aria-hidden="true">
                    *
                </span>
            )}
        </label>
    )
}

/** ช่องกรอกของหน้า auth — สูง 48px มุมมน เส้นขอบกรมท่าอ่อน โฟกัสเป็นเส้นกรมท่า (ใช้กับ Input/Select/textarea) */
export const AUTH_INPUT =
    "h-12 rounded-xl border-[1.5px] border-denim-field bg-white px-4 text-[15px] text-denim-deep placeholder:text-denim-muted/70 hover:border-denim-dash focus:border-denim focus:outline-none focus-visible:ring-2 focus-visible:ring-denim/20 aria-[invalid=true]:border-red-500"

/** ช่องกรอกที่มีไอคอนนำหน้า */
export const AuthIconInput = forwardRef<HTMLInputElement, InputProps & { icon: LucideIcon }>(function AuthIconInput(
    { icon: Icon, className, ...props },
    ref
) {
    return (
        <div className="relative">
            <Icon className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-denim-muted" aria-hidden="true" />
            <Input ref={ref} className={cn(AUTH_INPUT, "pl-11", className)} {...props} />
        </div>
    )
})

/** ช่องรหัสผ่าน + ปุ่มแสดง/ซ่อน (ไอคอนตาด้านขวา) */
export const AuthPasswordInput = forwardRef<HTMLInputElement, InputProps>(function AuthPasswordInput({ className, ...props }, ref) {
    const [visible, setVisible] = useState(false)
    return (
        <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-denim-muted" aria-hidden="true" />
            <Input ref={ref} type={visible ? "text" : "password"} className={cn(AUTH_INPUT, "pl-11 pr-12", className)} {...props} />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                aria-pressed={visible}
                className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-denim-muted transition-colors hover:bg-denim-paper hover:text-denim-deep"
            >
                {visible ? <EyeOff className="size-[18px]" aria-hidden="true" /> : <Eye className="size-[18px]" aria-hidden="true" />}
            </button>
        </div>
    )
})

/** กล่องแจ้งข้อผิดพลาดของฟอร์ม */
export function AuthError({ children }: { children: React.ReactNode }) {
    return (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {children}
        </div>
    )
}
