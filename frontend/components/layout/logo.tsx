import { cn } from "@/lib/utils"

interface LogoProps {
    /** ใช้ "dark" บนพื้นเข้ม (hero navy, sidebar admin) เพื่อให้ "Comp" อ่านออก */
    variant?: "light" | "dark"
    className?: string
}

/**
 * Wordmark หลักของระบบ — "Comp" ทึบ + "Active" gradient
 * ใช้แทนที่ไอคอน/ข้อความเดิมทุกจุดที่เป็นโลโก้ (header, footer, sidebar admin)
 */
/**
 * โลโก้ธีม Denim Varsity — กล่องยีนส์ "</>" + wordmark + บรรทัดชื่อวิทยาลัย (header ฝั่งผู้จัดและฝั่ง public ใช้ตัวเดียวกัน)
 * ฟอนต์มาจาก lib/denim-fonts.ts (ผูกไว้บน <html>)
 */
export function DenimLogo() {
    return (
        <span className="flex items-center gap-3">
            <span
                aria-hidden="true"
                className="denim-weave grid size-11 shrink-0 place-items-center rounded-xl font-code text-[15px] font-semibold text-white"
            >
                &lt;/&gt;
            </span>
            <span className="flex flex-col leading-[1.1]">
                <span className="font-display text-[22px] font-bold tracking-[-0.01em] text-denim-deep">
                    Comp<span className="text-denim-accent">Active</span>
                </span>
                <span className="hidden text-xs text-denim-muted sm:block">วิทยาลัยการคอมพิวเตอร์ มข.</span>
            </span>
        </span>
    )
}

export function Logo({ variant = "light", className }: LogoProps) {
    return (
        <span className={cn("font-heading font-black tracking-tight", className)}>
            <span className={variant === "dark" ? "text-white" : "text-brand-900"}>Comp </span>
            <span className="bg-gradient-to-r from-brand-600 to-brand-300 bg-clip-text text-transparent">
                Active
            </span>
        </span>
    )
}
