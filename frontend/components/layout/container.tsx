import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * คุมความกว้างเนื้อหาให้เท่ากันทุกหน้า
 * เดิมแต่ละหน้าเขียน `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` เองซ้ำ ๆ
 */
const Container = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}
        {...props}
    />
))
Container.displayName = "Container"

export { Container }
