import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

/**
 * ครอบ <select> ของ HTML ไม่ใช่ custom dropdown
 * เหตุผล: บนมือถือเด้ง picker ของระบบซึ่งกรอกง่ายกว่ามาก
 * และรองรับ <optgroup> ที่จำเป็นสำหรับกลุ่ม "เกินแผนการเรียน"
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div className="relative">
                <select
                    ref={ref}
                    className={cn(
                        "flex h-10 w-full appearance-none rounded-md border border-border bg-white px-3 py-2 pr-9 text-sm text-gray-900 transition-colors hover:border-gray-300 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60",
                        className
                    )}
                    {...props}
                >
                    {children}
                </select>
                <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-400"
                    aria-hidden="true"
                />
            </div>
        )
    }
)
Select.displayName = "Select"

export { Select }
