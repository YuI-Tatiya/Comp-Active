import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Plus } from "lucide-react"
import { AMBER_BUTTON, DenimHero, OUTLINE_ON_DENIM_BUTTON, TerminalPrompt } from "@/components/denim/denim-ui"

/**
 * ส่วนบนของหน้าหลักผู้จัด (ธีม Denim Varsity) — แถบทักทายพื้นยีนส์ + มาสคอต DEK COM
 * การ์ดสถิติ (OrganizerStatCards ใน denim-ui.tsx) ต้องวางต่อท้ายทันที: ดึงตัวเองขึ้นมาทับขอบล่างของส่วนนี้ (-mt-16)
 * ซึ่งเผื่อที่ไว้ให้แล้วด้วย pb-24 ของคอลัมน์ข้อความ
 */
export function OrganizerHero({ name, summary }: { name: string; summary: string }) {
    return (
        <DenimHero className="flex min-h-[420px] flex-wrap items-end justify-between gap-6">
            <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-[22px] pb-24">
                <TerminalPrompt>~/comp-active/organizer $ whoami</TerminalPrompt>
                <h1 className="break-words font-display text-4xl font-bold leading-[1.05] tracking-[-0.015em] text-white [text-wrap:balance] sm:text-5xl lg:text-[clamp(40px,5.2vw,64px)]">
                    สวัสดี <span className="text-amber">{name}</span>
                    <br />
                    วันนี้จะปล่อยกิจกรรมอะไรดี?
                </h1>
                <p className="max-w-[520px] text-lg leading-relaxed text-denim-on">{summary}</p>
                <div className="flex flex-wrap gap-3">
                    <Link href="/organizer/create" className={AMBER_BUTTON}>
                        <Plus className="size-5" strokeWidth={2.4} aria-hidden="true" />
                        สร้างกิจกรรมใหม่
                    </Link>
                    <Link href="/organizer/dashboard" className={OUTLINE_ON_DENIM_BUTTON}>
                        ดูแดชบอร์ดผู้เข้าร่วม
                        <ArrowRight className="size-[18px]" aria-hidden="true" />
                    </Link>
                </div>
            </div>

            {/* มาสคอตเฉพาะจอกว้าง (lg+) ที่วางข้างข้อความได้ — จอแคบกว่านี้จะตกลงไปใต้ปุ่ม ทำให้แถบทักทายสูงขึ้นอีก ~400px
                ฟองคำพูดยื่นเข้าไปทางซ้าย 150px จึงรอถึง xl: ที่ 1024px มันทับท้ายบรรทัดที่สองของหัวข้อ (วัดจากภาพจริงแล้ว) */}
            <div className="relative mx-auto hidden shrink-0 items-end lg:flex">
                <div className="absolute -left-[150px] top-[18px] hidden w-[190px] rounded-[18px_18px_4px_18px] bg-white px-4 py-3 text-[15px] font-semibold leading-snug text-denim-deep shadow-[0_10px_24px_-10px_rgb(0_0_0_/_0.4)] xl:block">
                    หวัดดี! มีกิจกรรมใหม่มาให้ทุกคนแล้วนะ
                    <span className="mt-1 block font-code text-xs font-normal text-denim-accent">— DEK COM</span>
                </div>
                <Image
                    src="/mascot-wave.png"
                    alt="มาสคอต DEK COM ใส่แจ็กเก็ตวาร์ซิตี้ยีนส์โบกมือทักทาย"
                    width={421}
                    height={900}
                    sizes="187px"
                    priority
                    className="mascot-bob h-[400px] w-auto drop-shadow-[0_20px_30px_rgb(0_0_0_/_0.35)]"
                />
            </div>
        </DenimHero>
    )
}
