"use client"

import { SOFT_SKILL_TIERS } from "@/lib/soft-skills"
import { cn } from "@/lib/utils"

interface TierButtonsProps {
    value: number | undefined
    /** ระดับที่เกินเพดานของกิจกรรมจะถูกล็อก */
    cap: number
    onChange: (tier: 2 | 3 | 5) => void
    label: string
    disabled?: boolean
}

/** ตัวเลือกระดับพฤติกรรม 3 ระดับ (ผ่าน/ดี/ดีเยี่ยม) — ใช้ร่วมทั้งหน้าประเมินของผู้จัดและแบบประเมินของนักศึกษา */
export function TierButtons({ value, cap, onChange, label, disabled = false }: TierButtonsProps) {
    return (
        <div className="flex gap-1.5" role="group" aria-label={label}>
            {SOFT_SKILL_TIERS.map((tier) => {
                const locked = tier.value > cap
                const selected = value === tier.value
                return (
                    <button
                        key={tier.value}
                        type="button"
                        title={locked ? "กิจกรรมนี้ยังไม่ปลดล็อกระดับนี้" : tier.hint}
                        disabled={locked || disabled}
                        aria-pressed={selected}
                        onClick={() => onChange(tier.value)}
                        className={cn(
                            "rounded-full border px-3 py-1 text-xs font-bold transition-colors",
                            locked
                                ? "cursor-not-allowed border-border bg-surface text-fg-subtle opacity-50"
                                : disabled
                                    ? selected
                                        ? "cursor-default border-brand-600 bg-brand-600 text-white opacity-80"
                                        : "cursor-not-allowed border-border bg-surface text-fg-subtle opacity-50"
                                    : selected
                                        ? "border-brand-600 bg-brand-600 text-white"
                                        : "border-border bg-bg text-fg-muted hover:border-border-strong"
                        )}
                    >
                        {tier.label}
                    </button>
                )
            })}
        </div>
    )
}
