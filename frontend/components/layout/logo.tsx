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
