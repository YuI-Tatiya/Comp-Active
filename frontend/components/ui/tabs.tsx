"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const TabsContext = React.createContext<{
    activeTab?: string
    setActiveTab?: (value: string) => void
}>({})

const Tabs = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        defaultValue?: string
        // ควบคุมจากภายนอกได้ (เช่นสลับไปแท็บที่เพิ่งเพิ่ม) — ถ้าไม่ส่ง value มา จะใช้ state ภายในตามเดิม
        value?: string
        onValueChange?: (value: string) => void
    }
>(({ className, defaultValue, value, onValueChange, children, ...props }, ref) => {
    const [internalTab, setInternalTab] = React.useState(defaultValue)
    const isControlled = value !== undefined
    const activeTab = isControlled ? value : internalTab
    const setActiveTab = (v: string) => {
        if (!isControlled) setInternalTab(v)
        onValueChange?.(v)
    }

    return (
        <TabsContext.Provider value={{ activeTab, setActiveTab }}>
            <div ref={ref} className={cn("", className)} {...props}>
                {children}
            </div>
        </TabsContext.Provider>
    )
})
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "inline-flex h-10 items-center justify-center rounded-md bg-surface-2 p-1 text-fg-muted",
            className
        )}
        {...props}
    />
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, ...props }, ref) => {
    const { activeTab, setActiveTab } = React.useContext(TabsContext)

    return (
        <button
            ref={ref}
            // หน้าที่ใช้คลาส data-[state=active]:... ของตัวเอง (เช่น student/profile) จะทับค่า default
            // นี้ได้ตามปกติ — attribute นี้จำเป็นสำหรับทั้งสองกรณี ไม่งั้นสไตล์ active ไม่ทำงานเลย
            data-state={activeTab === value ? "active" : "inactive"}
            onClick={() => setActiveTab?.(value)}
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-bg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                // แท็บที่เลือกอยู่เป็นปุ่มสีน้ำเงินทึบ — โทนเดียวกับปุ่มหลัก (Button variant="default") ของทั้งแอป
                // ไม่ใช่แค่ตัวหนังสือสีน้ำเงินบนพื้นขาวจางๆ ให้เด่นชัดจากแท็บอื่นจริงๆ โดยเฉพาะตอนมีแท็บเดียว
                activeTab === value ? "bg-brand-600 text-white shadow-xs" : "text-fg-muted hover:text-fg",
                className
            )}
            {...props}
        />
    )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, ...props }, ref) => {
    const { activeTab } = React.useContext(TabsContext)

    if (activeTab !== value) return null
    return (
        <div
            ref={ref}
            className={cn(
                "mt-2 ring-offset-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg focus-visible:ring-offset-2",
                className
            )}
            {...props}
        />
    )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
