import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default: "bg-brand-600 text-white shadow-xs hover:bg-brand-700",
                secondary: "bg-surface-2 text-fg hover:bg-border",
                outline: "border border-border bg-bg text-fg hover:bg-surface",
                ghost: "text-fg-muted hover:bg-surface hover:text-fg",
                destructive: "bg-danger text-white shadow-xs hover:opacity-90",
                link: "text-brand-600 underline-offset-4 hover:underline",
            },
            size: {
                sm: "h-8 px-3 text-sm",
                default: "h-10 px-4 text-sm",
                lg: "h-11 px-6 text-sm",
                xl: "h-12 px-8 text-base",
                icon: "size-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
