import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { AMBER_BUTTON, DenimHero, OUTLINE_ON_DENIM_BUTTON } from "@/components/denim/denim-ui"

/**
 * แถบหัวหน้าของหน้าแรกฝั่ง public (ธีม Denim Varsity) — ข้อความเชิญชวน + หน้าต่างเบราว์เซอร์ที่มีภาพอาคารวิทยาลัย
 * โดยมีมาสคอต DEK COM โผล่หัวจากหลังหน้าต่าง (จอ lg+ เท่านั้น — จอแคบกว่านั้นภาพจะดันข้อความจนแถบสูงเกินจอ)
 *
 * ภาพอาคารใช้ college-building.png (เรนเดอร์จาก college.svg แบบพื้นโปร่งใส) ผ่าน next/image ที่ย่อ+แปลงเป็น WebP
 * ให้เอง — ไฟล์ SVG เดิมหนัก 20MB (ฝังภาพไว้ข้างใน) และ next/image ไม่ย่อ SVG ให้ หน้าแรกจึงต้องโหลดเต็มๆ ทุกครั้ง
 */
export function PublicHero() {
    return (
        <DenimHero className="flex flex-wrap items-end justify-between gap-x-10 gap-y-10">
            <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6 pb-14 sm:pb-16">
                <p className="flex items-center gap-3 text-sm text-denim-on">
                    <span className="h-0.5 w-7 shrink-0 rounded-full bg-amber" aria-hidden="true" />
                    วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น
                </p>
                <h1 className="font-display text-[40px] font-bold leading-[1.08] tracking-[-0.015em] text-white sm:text-5xl xl:text-[60px]">
                    Building Skills
                    {/* "Hands-On" ห้ามตัดตรงขีด — ไม่งั้นได้ "Hands-" / "On" คนละบรรทัด */}
                    <span className="block text-amber">
                        Through <span className="whitespace-nowrap">Hands-On</span> Activities
                    </span>
                </h1>
                <p className="max-w-[480px] text-base leading-relaxed text-denim-on sm:text-lg">
                    นักศึกษาวิทยาลัยการคอมพิวเตอร์ อย่าลืมเข้ามาลงทะเบียนเข้าร่วมกิจกรรมเพื่อพัฒนาทักษะนอกห้องเรียนของคุณ
                </p>
                <div className="flex flex-wrap gap-3">
                    <Link href="/auth" className={AMBER_BUTTON}>
                        เริ่มต้นใช้งาน
                        <ArrowRight className="size-[18px]" aria-hidden="true" />
                    </Link>
                    <Link href="/events" className={OUTLINE_ON_DENIM_BUTTON}>
                        ดูกิจกรรมทั้งหมด
                        <ArrowRight className="size-[18px]" aria-hidden="true" />
                    </Link>
                </div>
            </div>

            {/* lg: หน้าต่างแคบลงให้วางข้างข้อความได้ (ไม่งั้นตกลงไปแถวใหม่ใต้ปุ่ม แถบหัวหน้าสูงเกินจอ) · xl: ขนาดเต็มตามดีไซน์ */}
            <div className="relative hidden w-full max-w-[380px] shrink-0 self-end pt-[110px] lg:block xl:max-w-[560px] xl:pt-[150px]">
                {/* มาสคอตอยู่หลังหน้าต่าง (z ต่ำกว่า) — เห็นแค่หัวกับมือที่โบกเหนือขอบหน้าต่าง */}
                <div className="absolute right-8 top-0 z-0" aria-hidden="true">
                    <div className="absolute -left-[150px] top-[34px] hidden whitespace-nowrap rounded-[16px_16px_4px_16px] bg-white px-4 py-2.5 text-sm font-semibold text-denim-deep shadow-[0_10px_24px_-10px_rgb(0_0_0_/_0.45)] xl:block">
                        มาเก็บ Soft Skills กัน!
                    </div>
                    <Image
                        src="/mascot-wave.png"
                        alt=""
                        width={421}
                        height={900}
                        sizes="140px"
                        className="mascot-bob h-[220px] w-auto drop-shadow-[0_16px_24px_rgb(0_0_0_/_0.35)] xl:h-[300px]"
                    />
                </div>

                <div className="relative z-10 overflow-hidden rounded-t-2xl border border-b-0 border-white/15 bg-denim-mid shadow-[0_-12px_40px_-14px_rgb(0_0_0_/_0.55)]">
                    <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3" aria-hidden="true">
                        <span className="size-2.5 rounded-full bg-amber" />
                        <span className="size-2.5 rounded-full bg-denim-on-soft" />
                        <span className="size-2.5 rounded-full bg-denim-on-muted/70" />
                        <span className="ml-2 font-code text-xs text-white/80">computing.kku.ac.th</span>
                    </div>
                    <Image
                        src="/college-building.png"
                        alt="อาคารวิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น"
                        width={1493}
                        height={728}
                        sizes="(min-width: 1280px) 560px, 380px"
                        priority
                        className="h-auto w-full px-4 pt-4"
                    />
                </div>
            </div>
        </DenimHero>
    )
}
