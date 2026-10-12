"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowLeft, Maximize2 } from "lucide-react"
import { Container } from "@/components/layout/container"
import { ImageLightbox } from "@/components/ui/image-lightbox"
import { TerminalPrompt, coverPattern, useUploadImage } from "@/components/denim/denim-ui"
import { cn } from "@/lib/utils"

/* แถบหัวหน้าจัดการงาน/กิจกรรมของผู้จัด (ธีม Denim Varsity) — ใช้ร่วมกันทั้ง /organizer/events/[id] และ
   /organizer/activities/[id] การ์ดสถิติของ ActivityParticipantManager ดึงขึ้นมาทับขอบล่าง 64px (-mt-16)
   จึงเผื่อ padding ล่างไว้ 96px (pb-24) */

/** ปุ่มหลักสีอำพันในแถบหัวหน้า (แก้ไขงาน) */
export const HERO_PRIMARY_BUTTON =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber px-4 text-sm font-semibold text-denim-deep shadow-[0_3px_0_var(--color-amber-deep)] transition-[transform,box-shadow] hover:-translate-y-px active:translate-y-0.5 active:shadow-[0_1px_0_var(--color-amber-deep)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"

/** ปุ่มรองเส้นขอบขาวบนพื้นยีนส์ (จบกิจกรรม / แชร์) */
export const HERO_OUTLINE_BUTTON =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-[1.5px] border-white/40 bg-transparent px-4 text-sm font-semibold text-white transition-colors hover:border-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"

/** ปุ่มอันตรายแบบข้อความ (ยกเลิกกิจกรรม) — แดงอ่อนอ่านออกบนพื้นยีนส์ (แดงเข้มกลืนกับกรมท่า) */
export const HERO_DANGER_BUTTON =
    "inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-red-300 transition-colors hover:bg-white/10 hover:text-red-200 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"

/** ป้ายขาวบนปก — มีจุดสีถ้าเป็นสถานะ */
export function HeroCoverPill({ dot, children }: { dot?: string; children: React.ReactNode }) {
    return (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-denim-deep shadow-[0_4px_12px_-6px_rgb(0_0_0/0.5)]">
            {dot && <span className={cn("size-[7px] rounded-full", dot)} aria-hidden="true" />}
            {children}
        </span>
    )
}

interface OrganizerActivityHeroProps {
    backHref: string
    /** บรรทัดคำสั่งเทอร์มินัลมุมขวาบน เช่น "~/organizer/events/12 $ manage" */
    prompt: string
    /** path รูปที่ผู้จัดแนบ (เช่น /uploads/activities/x.jpg) — ไม่มี/โหลดไม่ขึ้น = ลายปกตามหมวด + มาสคอตโบกมือ */
    imagePath?: string | null
    imageAlt: string
    /** หมวดหมู่ — เลือกลายปกตอนไม่มีรูป */
    categories: string[]
    /** ป้ายมุมบนซ้ายของปก (สถานะเผยแพร่/จำนวนกิจกรรมย่อย ฯลฯ) */
    pills?: React.ReactNode
    byline?: string
    title: string
    description?: string | null
    /** ชิปข้อมูลใต้คำอธิบาย (วันเวลา สถานที่) */
    meta: { icon: LucideIcon; label: string }[]
    /** ปุ่มฝั่งซ้าย — ใช้ HERO_PRIMARY_BUTTON / HERO_OUTLINE_BUTTON */
    actions: React.ReactNode
    /** ปุ่มอันตรายชิดขวา (ยกเลิกกิจกรรม) — ใช้ HERO_DANGER_BUTTON */
    danger?: React.ReactNode
}

export function OrganizerActivityHero({
    backHref,
    prompt,
    imagePath,
    imageAlt,
    categories,
    pills,
    byline,
    title,
    description,
    meta,
    actions,
    danger,
}: OrganizerActivityHeroProps) {
    const image = useUploadImage(imagePath)
    const [lightboxOpen, setLightboxOpen] = useState(false)

    return (
        <section className="denim-weave relative overflow-hidden">
            <Container className="pb-24 pt-6 sm:pt-8">
                <div className="flex items-center justify-between gap-4">
                    <Link
                        href={backHref}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border-[1.5px] border-white/40 px-4 text-sm font-semibold text-white transition-colors hover:border-white/70 hover:bg-white/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                        กลับสู่หน้าจัดการ
                    </Link>
                    <div className="hidden min-w-0 sm:block">
                        <TerminalPrompt>{prompt}</TerminalPrompt>
                    </div>
                </div>

                <div className="mt-7 flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
                    {/* ปก — กรอบเส้นประอำพันรอบรูป */}
                    <div className="w-full shrink-0 rounded-[24px] border-2 border-dashed border-amber/60 p-1.5 md:w-[260px]">
                        <div
                            className={cn(
                                "relative aspect-[16/9] overflow-hidden rounded-[18px] md:aspect-[8/7]",
                                coverPattern("open", categories)
                            )}
                        >
                            {image.show ? (
                                <>
                                    {/* eslint-disable-next-line @next/next/no-img-element -- รูปอัปโหลดเสิร์ฟจาก backend (/uploads) ไม่ได้ผ่านตัวย่อรูปของ Next */}
                                    <img src={image.src!} alt={imageAlt} onError={image.onError} className="absolute inset-0 size-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setLightboxOpen(true)}
                                        aria-label="ดูภาพขนาดใหญ่"
                                        className="absolute bottom-2.5 right-2.5 grid size-9 place-items-center rounded-lg bg-denim-deep/70 text-white backdrop-blur-sm transition-colors hover:bg-denim-deep/85 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
                                    >
                                        <Maximize2 className="size-4" aria-hidden="true" />
                                    </button>
                                </>
                            ) : (
                                // ไม่มีรูป — มาสคอตโบกมือบนลายปก (ครอปช่วงเอว) แทนรูป placeholder สีเทา
                                <Image
                                    src="/mascot-wave.png"
                                    alt=""
                                    width={421}
                                    height={900}
                                    sizes="200px"
                                    priority
                                    className="absolute left-1/2 top-[8%] h-[150%] w-auto -translate-x-1/2 drop-shadow-[0_12px_20px_rgb(0_0_0/0.35)]"
                                />
                            )}
                            {pills && <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">{pills}</div>}
                        </div>
                    </div>

                    <div className="min-w-0 flex-1">
                        {byline && (
                            <span className="inline-block rounded-md bg-amber px-2 py-0.5 text-xs font-semibold text-denim-deep">{byline}</span>
                        )}
                        <h1 className="mt-2.5 break-words pt-1 font-display text-[34px] font-bold leading-[1.15] text-white sm:text-[46px]">{title}</h1>
                        {description && (
                            <p className="mt-2 line-clamp-3 max-w-3xl whitespace-pre-line text-[15px] leading-relaxed text-denim-on" title={description}>
                                {description}
                            </p>
                        )}
                        <div className="mt-4 flex flex-wrap gap-2">
                            {meta.map(({ icon: Icon, label }) => (
                                <span
                                    key={label}
                                    className="inline-flex max-w-full items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-sm text-white"
                                >
                                    <Icon className="size-4 shrink-0 text-amber" aria-hidden="true" />
                                    <span className="min-w-0 truncate">{label}</span>
                                </span>
                            ))}
                        </div>
                        <div className="mt-5 flex flex-wrap items-center gap-2.5">
                            {actions}
                            {danger && <div className="sm:ml-auto">{danger}</div>}
                        </div>
                    </div>
                </div>
            </Container>
            {image.show && <ImageLightbox src={image.src!} alt={imageAlt} open={lightboxOpen} onOpenChange={setLightboxOpen} />}
        </section>
    )
}
