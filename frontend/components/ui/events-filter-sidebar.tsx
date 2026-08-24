"use client"

import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { Search, X } from "lucide-react"
import { CATEGORIES } from "@/lib/categories"
import {
    STATUS_OPTIONS,
    RANGE_OPTIONS,
    SORT_OPTIONS,
    SORT_HELP,
    RANGE_HELP,
    type EventsFilterValues,
} from "@/lib/events-filter"
import { cn } from "@/lib/utils"

export type { EventsFilterValues }

interface EventsFilterSidebarProps {
    values: EventsFilterValues
    onChange: (values: EventsFilterValues) => void
    onReset: () => void
    resultCount?: number
    className?: string
}

function toggleInArray(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

/** แผงตัวกรองแนวตั้ง — ใช้ทั้งเป็น sidebar บนจอกว้าง และเนื้อหาใน Dialog บนมือถือ */
export function EventsFilterSidebar({ values, onChange, onReset, resultCount, className }: EventsFilterSidebarProps) {
    const activeCount =
        values.categories.length +
        values.statuses.length +
        (values.certOnly ? 1 : 0) +
        (values.range ? 1 : 0) +
        (values.search.trim() ? 1 : 0)

    return (
        <div className={cn("space-y-6", className)}>
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-fg">ตัวกรอง</h2>
                {activeCount > 0 && (
                    <button
                        type="button"
                        onClick={onReset}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                    >
                        <X className="size-3" aria-hidden="true" /> ล้างตัวกรอง
                    </button>
                )}
            </div>

            <div>
                <label className="mb-1.5 block text-xs font-semibold text-fg-muted" htmlFor="events-filter-search">
                    ค้นหา
                </label>
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
                    <Input
                        id="events-filter-search"
                        type="text"
                        placeholder="ค้นหาชื่องานหรือกิจกรรม..."
                        className="h-10 rounded-lg pl-10"
                        value={values.search}
                        onChange={(e) => onChange({ ...values, search: e.target.value })}
                    />
                </div>
            </div>

            <fieldset>
                <legend className="mb-2 text-xs font-semibold text-fg-muted">หมวดหมู่</legend>
                <div className="space-y-2">
                    {CATEGORIES.map((c) => (
                        <label key={c.value} className="flex cursor-pointer items-center gap-2 text-sm text-fg">
                            <input
                                type="checkbox"
                                className="size-4 rounded border-border text-brand-600 focus:ring-brand-500"
                                checked={values.categories.includes(c.value)}
                                onChange={() => onChange({ ...values, categories: toggleInArray(values.categories, c.value) })}
                            />
                            <span className={cn("size-2 rounded-full", c.dot)} aria-hidden="true" />
                            {c.label}
                        </label>
                    ))}
                </div>
            </fieldset>

            <fieldset>
                <legend className="mb-2 text-xs font-semibold text-fg-muted">สถานะรับสมัคร</legend>
                <div className="space-y-2">
                    {STATUS_OPTIONS.map((o) => (
                        <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm text-fg">
                            <input
                                type="checkbox"
                                className="size-4 rounded border-border text-brand-600 focus:ring-brand-500"
                                checked={values.statuses.includes(o.value)}
                                onChange={() => onChange({ ...values, statuses: toggleInArray(values.statuses, o.value) })}
                            />
                            {o.label}
                        </label>
                    ))}
                </div>
            </fieldset>

            <fieldset>
                <legend className="mb-2 text-xs font-semibold text-fg-muted">ใบรับรอง</legend>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-fg">
                    <input
                        type="checkbox"
                        className="size-4 rounded border-border text-brand-600 focus:ring-brand-500"
                        checked={values.certOnly}
                        onChange={(e) => onChange({ ...values, certOnly: e.target.checked })}
                    />
                    มีใบรับรองจิตอาสา
                </label>
            </fieldset>

            <div>
                <div className="mb-1.5 flex items-center gap-1">
                    <label className="text-xs font-semibold text-fg-muted" htmlFor="events-filter-range">
                        ช่วงเวลา
                    </label>
                    <InfoTooltip text={RANGE_HELP} label="คำอธิบายตัวกรองช่วงเวลา" />
                </div>
                <Select
                    id="events-filter-range"
                    className="h-10 rounded-lg"
                    value={values.range}
                    onChange={(e) => onChange({ ...values, range: e.target.value })}
                >
                    {RANGE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </Select>
            </div>

            <div>
                <div className="mb-1.5 flex items-center gap-1">
                    <label className="text-xs font-semibold text-fg-muted" htmlFor="events-filter-sort">
                        เรียงลำดับ
                    </label>
                    <InfoTooltip text={SORT_HELP} label="คำอธิบายตัวเลือกเรียงลำดับ" />
                </div>
                <Select
                    id="events-filter-sort"
                    className="h-10 rounded-lg"
                    value={values.sort}
                    onChange={(e) => onChange({ ...values, sort: e.target.value })}
                >
                    {SORT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </Select>
            </div>

            {resultCount !== undefined && (
                <p className="text-sm text-fg-muted">
                    พบ <span className="font-semibold text-fg">{resultCount}</span> รายการ
                </p>
            )}
        </div>
    )
}
