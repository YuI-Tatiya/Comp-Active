import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CalendarPlus, Check, GraduationCap, ShieldCheck, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { SectionHeading } from "@/components/ui/section-heading"
import { SOFT_SKILLS } from "@/lib/soft-skills"

const PROGRAMS = [
    { src: "/cs.png", alt: "วิทยาการคอมพิวเตอร์ (Computer Science)" },
    { src: "/it.png", alt: "เทคโนโลยีสารสนเทศ (Information Technology)" },
    { src: "/gis.png", alt: "ภูมิสารสนเทศศาสตร์ (Geoinformatics)" },
    { src: "/cy.png", alt: "ความมั่นคงปลอดภัยไซเบอร์ (Cybersecurity)" },
    { src: "/ai.png", alt: "ปัญญาประดิษฐ์ (Artificial Intelligence)" },
]

/** ความสามารถของระบบแยกตามบทบาท — ให้ตรงกับฟีเจอร์ที่มีอยู่จริงเท่านั้น */
const ROLES: { icon: LucideIcon; title: string; items: string[] }[] = [
    {
        icon: GraduationCap,
        title: "นักศึกษา",
        items: [
            "ค้นหาและลงทะเบียนเข้าร่วมกิจกรรม",
            "สะสมคะแนน Soft Skills 12 ด้านจากการเข้าร่วมกิจกรรม",
            "ติดตามผลการประเมินและความก้าวหน้าของตนเอง",
        ],
    },
    {
        icon: CalendarPlus,
        title: "ผู้จัดกิจกรรม",
        items: [
            "สร้างกิจกรรมและกำหนดทักษะที่ผู้เข้าร่วมจะได้รับ",
            "ตรวจสอบรายชื่อและเช็กอินผู้เข้าร่วม",
            "ประเมินผลและดูสรุปความคิดเห็นของกิจกรรม",
        ],
    },
    {
        icon: ShieldCheck,
        title: "ผู้ดูแลระบบ",
        items: [
            "อนุมัติและจัดการบัญชีผู้จัดกิจกรรม",
            "จัดการเนื้อหาหน้าแรกของระบบ",
            "ดูภาพรวมและสถิติการใช้งาน",
        ],
    },
]

interface AboutSectionsProps {
    /** ปลายทางของปุ่ม "ดูกิจกรรม" — แต่ละพอร์ทัล (public/student/organizer) มีหน้ากิจกรรมของตัวเอง */
    eventsHref?: string
}

/**
 * เนื้อหาหน้า "เกี่ยวกับเรา" — ใช้ร่วมกันทั้ง public (/about), student (/student/about)
 * และ organizer (/organizer/about) เพื่อให้ทั้งสามหน้าตรงกันเสมอ ไม่ต้องแก้ 3 ที่
 * ไม่รวม header/footer — แต่ละหน้าห่อด้วย chrome ของตัวเอง (SiteHeader/AppHeader ต่างกัน)
 * ตั้งใจให้เรียบและเป็นทางการ: ไม่มีแอนิเมชัน ใช้สี/ส่วนประกอบเดียวกับหน้าอื่นของระบบ
 */
export function AboutSections({ eventsHref = "/events" }: AboutSectionsProps) {
    return (
        <>
            {/* ── ส่วนหัว ─────────────────────────────────────────────────────── */}
            <section className="border-b border-border bg-surface">
                <Container className="grid items-center gap-10 py-14 lg:grid-cols-2 lg:gap-16 lg:py-20">
                    <div>
                        <p className="mb-3 text-sm font-medium text-brand-600">เกี่ยวกับเรา</p>
                        <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">เกี่ยวกับ Comp Active</h1>
                        <p className="mt-4 max-w-xl text-base leading-relaxed text-fg-muted">
                            ระบบบริหารกิจกรรมและติดตามทักษะ Soft Skills ของนักศึกษา
                            วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น
                        </p>
                        <Button asChild size="lg" className="mt-8">
                            <Link href={eventsHref}>
                                ดูกิจกรรม
                                <ArrowRight aria-hidden="true" />
                            </Link>
                        </Button>
                    </div>

                    <Image
                        src="/college_image.png"
                        alt="วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น"
                        width={1536}
                        height={1024}
                        priority
                        className="h-auto w-full rounded-2xl border border-border shadow-sm"
                    />
                </Container>
            </section>

            {/* ── ความเป็นมา ─────────────────────────────────────────────────── */}
            <section className="bg-bg">
                <Container className="py-16">
                    <div className="max-w-3xl">
                        <SectionHeading title="พื้นที่กลางของชาว College of Computing" />
                        <div className="mt-6 space-y-4 text-base leading-relaxed text-fg-muted">
                            <p>
                                เว็บไซต์นี้ถูกสร้างขึ้นเพื่อเป็นพื้นที่กลางสำหรับนักศึกษาสาขาวิทยาการคอมพิวเตอร์
                                ในการเข้าถึงข้อมูลข่าวสาร กิจกรรม และโอกาสในการพัฒนาตนเองได้อย่างสะดวกและเป็นระบบ
                            </p>
                            <p>
                                เราต้องการให้เว็บไซต์แห่งนี้เป็นพื้นที่ที่ช่วยให้นักศึกษาได้เรียนรู้ ค้นหาตัวเอง
                                และเติบโตไปพร้อมกับสังคมของชาว College of Computing
                            </p>
                            <p>
                                ผ่านการรวบรวมกิจกรรมต่าง ๆ ที่ช่วยส่งเสริมทั้งความรู้ทางด้านเทคโนโลยีและทักษะที่จำเป็นต่อการทำงานในอนาคต
                                ไม่ว่าจะเป็นการสื่อสาร การทำงานเป็นทีม การบริหารเวลา การคิดวิเคราะห์ และการปรับตัว
                            </p>
                        </div>
                    </div>
                </Container>
            </section>

            {/* ── ระบบนี้ทำอะไรได้บ้าง ───────────────────────────────────────── */}
            <section className="border-y border-border bg-surface">
                <Container className="py-16">
                    <SectionHeading title="ระบบนี้ทำอะไรได้บ้าง" description="การใช้งานหลักแยกตามบทบาทของผู้ใช้" />
                    <div className="mt-8 grid gap-5 md:grid-cols-3">
                        {ROLES.map(({ icon: Icon, title, items }) => (
                            <div key={title} className="rounded-xl border border-border bg-bg p-6 shadow-xs">
                                <span className="inline-flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                                    <Icon className="size-5" aria-hidden="true" />
                                </span>
                                <h3 className="mt-4 text-lg font-semibold text-fg">{title}</h3>
                                <ul className="mt-3 space-y-2">
                                    {items.map((item) => (
                                        <li key={item} className="flex gap-2 text-sm leading-relaxed text-fg-muted">
                                            <Check className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </Container>
            </section>

            {/* ── Soft Skills 12 ด้าน ───────────────────────────────────────── */}
            <section className="bg-bg">
                <Container className="py-16">
                    <SectionHeading
                        title={`Soft Skills ${SOFT_SKILLS.length} ด้าน`}
                        description="ทักษะที่ระบบใช้ประเมินผลจากการเข้าร่วมกิจกรรม"
                    />
                    <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {SOFT_SKILLS.map((skill) => {
                            const Icon = skill.icon
                            return (
                                <li key={skill.value} className="flex items-start gap-3 rounded-lg border border-border bg-bg p-4">
                                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                                        <Icon className="size-4" aria-hidden="true" />
                                    </span>
                                    <div>
                                        <p className="text-sm font-medium leading-snug text-fg">{skill.label}</p>
                                        <p className="mt-0.5 text-xs text-fg-subtle">{skill.labelEn}</p>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </Container>
            </section>

            {/* ── สาขาวิชา ───────────────────────────────────────────────────── */}
            <section className="border-y border-border bg-surface">
                <Container className="py-16">
                    <SectionHeading
                        title="สาขาวิชาในวิทยาลัยการคอมพิวเตอร์"
                        description={`${PROGRAMS.length} สาขาวิชา`}
                    />
                    <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                        {PROGRAMS.map((program) => (
                            <li key={program.src} className="overflow-hidden rounded-xl border border-border bg-bg">
                                <Image
                                    src={program.src}
                                    alt={program.alt}
                                    width={1536}
                                    height={1024}
                                    className="h-auto w-full object-cover"
                                />
                            </li>
                        ))}
                    </ul>
                </Container>
            </section>

            {/* ── เป้าหมายของเรา ─────────────────────────────────────────────── */}
            <section className="bg-bg">
                <Container className="grid items-center gap-10 py-16 lg:grid-cols-2 lg:gap-16">
                    <div>
                        <SectionHeading title="เป้าหมายของเรา" />
                        <div className="mt-6 space-y-4 text-base leading-relaxed text-fg-muted">
                            <p>
                                เราอยากให้นักศึกษาทุกคนสามารถค้นพบความสามารถของตัวเองผ่านการเข้าร่วมกิจกรรม
                                ได้เรียนรู้จากประสบการณ์จริง และสามารถนำทักษะที่ได้รับไปต่อยอดทั้งในการเรียน
                                การทำงาน และการใช้ชีวิต
                            </p>
                            <p>
                                เพราะเราเชื่อว่า การเติบโตไม่ได้เกิดขึ้นเฉพาะในห้องเรียน
                                แต่เกิดขึ้นจากทุกประสบการณ์ที่เราได้ลงมือทำ
                            </p>
                            <p>
                                เว็บไซต์นี้จึงถูกสร้างขึ้นเพื่อเป็นอีกหนึ่งพื้นที่ที่จะช่วยเชื่อมโยง
                                &ldquo;นักศึกษา – กิจกรรม – การเรียนรู้ – และการพัฒนาทักษะ&rdquo; เข้าด้วยกัน
                            </p>
                        </div>
                    </div>

                    <Image
                        src="/goal.png"
                        alt="เป้าหมายของ Comp Active"
                        width={1672}
                        height={940}
                        className="h-auto w-full rounded-2xl border border-border shadow-sm"
                    />
                </Container>
            </section>
        </>
    )
}
