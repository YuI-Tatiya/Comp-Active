"use client"

import { Check, Circle } from "lucide-react"
import { Container } from "@/components/layout/container"
import { AmberAvatarPatch, DenimInfoChip, TerminalPrompt, nameInitial } from "@/components/denim/denim-ui"
import { accountValidity } from "@/lib/organizer-account"
import { formatThaiDate } from "@/lib/transcript"
import { cn } from "@/lib/utils"

/* หน้าตั้งค่าบัญชีผู้จัด (/organizer/settings) ธีม Denim Varsity — แถบหัวพร้อมช่องอายุบัญชี, ฟอร์มข้อมูลบัญชี
   คั่นด้วยเส้นประแบบคอมเมนต์โค้ด, และรายการเงื่อนไขรหัสผ่านที่ติ๊กสดตามที่พิมพ์ สถานะ/การบันทึกอยู่ที่ page.tsx */

/* ── แถบหัว ──────────────────────────────────────────────────────────────── */

/** ช่องเส้นประ "ACCOUNT_VALID" มุมขวาของแถบหัว — แถบความคืบหน้า + ช่วงวันที่ใช้งานได้ */
function AccountValidityBox({
    createdAt,
    validUntil,
    now,
}: {
    createdAt?: string | null
    validUntil?: string | null
    now: Date
}) {
    const validity = accountValidity(createdAt, validUntil, now)

    return (
        <div className="denim-weave-deep w-full shrink-0 rounded-2xl border-2 border-dashed border-amber/55 px-5 py-4 sm:w-[340px]">
            <div className="flex items-center justify-between gap-3">
                <span className="font-code text-xs text-denim-on-soft">ACCOUNT_VALID</span>
                <span className="font-display text-lg font-bold text-amber">
                    {validity.kind === "unlimited"
                        ? "ไม่มีกำหนด"
                        : validity.kind === "expired"
                          ? "หมดอายุแล้ว"
                          : `เหลือ ${validity.daysRemaining.toLocaleString("th-TH")} วัน`}
                </span>
            </div>

            {validity.kind === "active" && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
                    <div
                        className="h-full rounded-full bg-amber transition-[width] duration-700"
                        style={{ width: `${validity.percentElapsed}%` }}
                    />
                </div>
            )}

            {(createdAt || validUntil) && (
                <p className="mt-3 text-xs text-denim-on-soft">
                    {createdAt && <>สมัครเมื่อ {formatThaiDate(createdAt)}</>}
                    {createdAt && validUntil && "   "}
                    {validUntil && validity.kind !== "unlimited" && <>ใช้งานได้ถึง {formatThaiDate(validUntil)}</>}
                </p>
            )}
        </div>
    )
}

export function OrganizerSettingsHero({
    name,
    username,
    email,
    createdAt,
    validUntil,
    now,
}: {
    name: string
    username?: string | null
    email?: string | null
    createdAt?: string | null
    validUntil?: string | null
    now: Date
}) {
    return (
        <section className="denim-weave relative overflow-hidden">
            <Container className="relative flex flex-col flex-wrap gap-6 pb-8 pt-8 sm:pt-10 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
                    <AmberAvatarPatch initial={nameInitial(name)} />
                    <div className="flex min-w-0 flex-col gap-2">
                        <TerminalPrompt>~/organizer $ settings --account</TerminalPrompt>
                        <h1 className="break-words font-display text-[32px] font-bold leading-[1.15] tracking-[-0.01em] text-white sm:text-[44px]">
                            {name}
                        </h1>
                        <p className="text-[15px] text-denim-on">ตั้งค่าบัญชีผู้จัดกิจกรรม</p>
                        <div className="flex flex-wrap gap-2">
                            <DenimInfoChip label="@" value={username || "ไม่ระบุชื่อผู้ใช้"} />
                            {email && <DenimInfoChip label="mail" value={email} />}
                        </div>
                    </div>
                </div>

                <AccountValidityBox createdAt={createdAt} validUntil={validUntil} now={now} />
            </Container>
        </section>
    )
}

/* ── ฟอร์มข้อมูลบัญชี ─────────────────────────────────────────────────────── */

/** หัวข้อย่อยแบบคอมเมนต์โค้ด คั่นแต่ละส่วนของฟอร์ม (// account.profile, // security) */
export function SettingsSectionLabel({
    comment,
    title,
    description,
}: {
    comment: string
    title: string
    description?: string
}) {
    return (
        <div>
            <p className="font-code text-xs text-denim-accent" aria-hidden="true">{`// ${comment}`}</p>
            <h2 className="mt-0.5 font-display text-2xl font-bold text-denim-deep">{title}</h2>
            {description && <p className="mt-1.5 text-sm text-denim-muted">{description}</p>}
        </div>
    )
}

/** เส้นคั่นประระหว่างส่วน — ช่องไฟเดียวกันทุกจุดที่คั่น */
export function SettingsDivider() {
    return <div className="border-t border-dashed border-denim-line" aria-hidden="true" />
}

/** ช่องกรอกพร้อมป้าย + คำอธิบายใต้ช่อง (ถ้ามี) — ใช้ซ้ำทุกฟิลด์ในฟอร์มนี้ */
export function SettingsField({
    htmlFor,
    label,
    hint,
    children,
}: {
    htmlFor: string
    label: React.ReactNode
    hint?: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <div className="space-y-2">
            <label htmlFor={htmlFor} className="text-sm font-semibold text-denim-deep">
                {label}
            </label>
            {children}
            {hint && <p className="text-xs leading-relaxed text-denim-muted">{hint}</p>}
        </div>
    )
}

/* ── เงื่อนไขรหัสผ่าน ─────────────────────────────────────────────────────── */

function RequirementPill({ met, children }: { met: boolean; children: React.ReactNode }) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                met ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-denim-line text-denim-muted"
            )}
        >
            {met ? (
                <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
            ) : (
                <Circle className="size-3.5" aria-hidden="true" />
            )}
            {children}
        </span>
    )
}

/** รายการเงื่อนไขรหัสผ่านที่ติ๊กสดตามที่พิมพ์ — ว่างเปล่า (ไม่ตั้งใจเปลี่ยน) ยังไม่ติ๊กอะไรเลย ไม่ใช่ติ๊กผิดครบชุด */
export function PasswordRequirements({ value }: { value: string }) {
    return (
        <div className="flex flex-wrap gap-2" aria-live="polite">
            <RequirementPill met={value.length >= 8}>อย่างน้อย 8 ตัวอักษร</RequirementPill>
            <RequirementPill met={/[A-Za-z]/.test(value)}>มีตัวอักษร</RequirementPill>
            <RequirementPill met={/\d/.test(value)}>มีตัวเลข</RequirementPill>
        </div>
    )
}
