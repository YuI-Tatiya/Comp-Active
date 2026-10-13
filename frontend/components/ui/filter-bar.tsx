"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Search, SlidersHorizontal, X } from "lucide-react"

/**
 * แถบค้นหา + ตัวกรอง แบบ card เดี่ยว — ใช้ที่ /organizer/manage
 * รับ "ชุดตัวกรอง" (FilterSpec[]) จากหน้าที่เรียกใช้ จึงปรับจำนวน/ตัวเลือกได้อิสระ
 * โดยไม่ต้องแก้ component นี้ — ช่องตัวกรองจัดด้วย auto-fill grid ให้แถวสม่ำเสมอเสมอ
 */

export interface FilterOption {
    value: string
    label: string
}

export interface FilterSpec {
    /** key ที่ใช้อ้างอิงค่าใน values */
    key: string
    label: string
    options: FilterOption[]
    /** ค่าที่ถือว่า "ไม่ได้กรอง" — ไม่นับรวมใน activeCount */
    neutralValue?: string
}

interface FilterBarProps {
    searchValue: string
    onSearchChange: (value: string) => void
    searchPlaceholder?: string
    filters: FilterSpec[]
    values: Record<string, string>
    onFilterChange: (key: string, value: string) => void
    onReset: () => void
    /** จำนวนผลลัพธ์ที่เหลือหลังกรอง */
    resultCount?: number
    resultUnit?: string
}

export function FilterBar({
    searchValue,
    onSearchChange,
    searchPlaceholder = "ค้นหา...",
    filters,
    values,
    onFilterChange,
    onReset,
    resultCount,
    resultUnit = "รายการ",
}: FilterBarProps) {
    const activeCount =
        filters.filter((f) => {
            const neutral = f.neutralValue ?? ""
            return (values[f.key] ?? neutral) !== neutral
        }).length + (searchValue.trim() ? 1 : 0)

    return (
        <div className="mb-8 space-y-4 rounded-2xl border border-border bg-bg p-5 shadow-xs">
            {/* ค้นหา + ตัวกรอง อยู่แถวเดียวกันตั้งแต่จอกว้าง (xl+) ไม่งั้น stack เป็น 2 แถวเหมือนเดิม —
                xl ไม่ใช่ lg เพราะหน้าที่มีตัวกรองเยอะ (เช่น /organizer/manage) จะแน่นเกินไปถ้าบีบเร็วกว่านี้ */}
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
                <div className="xl:w-64 xl:shrink-0">
                    <label className="mb-1.5 block text-xs font-semibold text-fg-muted" htmlFor="filter-search">
                        ค้นหา
                    </label>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
                        <Input
                            id="filter-search"
                            type="text"
                            placeholder={searchPlaceholder}
                            className="h-10 rounded-lg pl-10 focus-visible:ring-brand-500"
                            value={searchValue}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>
                </div>

                {/* auto-fill แทน flex-wrap — ทุกช่องกว้างเท่ากันเสมอไม่ว่าจะมีตัวกรองกี่ตัว
                    ไม่ทิ้งช่องว้างท้ายแถวแบบสุ่มเวลาจำนวนตัวกรองหารไม่ลงตัวกับความกว้างจอ */}
                <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
                    {filters.map((f) => (
                        <div key={f.key}>
                            <label
                                className="mb-1.5 block text-xs font-semibold text-fg-muted"
                                htmlFor={`filter-${f.key}`}
                            >
                                {f.label}
                            </label>
                            <Select
                                id={`filter-${f.key}`}
                                className="h-10 rounded-lg"
                                value={values[f.key] ?? f.neutralValue ?? ""}
                                onChange={(e) => onFilterChange(f.key, e.target.value)}
                            >
                                {f.options.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                {resultCount !== undefined ? (
                    <p className="text-sm text-fg-muted">
                        พบ <span className="font-semibold text-fg">{resultCount}</span> {resultUnit}
                    </p>
                ) : (
                    <span />
                )}
                {activeCount > 0 && (
                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                            <SlidersHorizontal className="size-3" aria-hidden="true" />
                            ใช้ตัวกรอง {activeCount} รายการ
                        </span>
                        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onReset}>
                            <X className="size-3" aria-hidden="true" /> ล้างตัวกรอง
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
