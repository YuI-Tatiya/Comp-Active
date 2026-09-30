import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CalendarSearch, ClipboardCheck, QrCode, Trophy } from "lucide-react"
import { Container } from "@/components/layout/container"
import { Logo } from "@/components/layout/logo"
import { SOFT_SKILLS } from "@/lib/soft-skills"
import { HeroBackdrop } from "@/components/about/hero-backdrop"
import { TerminalHero } from "@/components/about/terminal-hero"
import { Reveal } from "@/components/about/reveal"
import { CountUp } from "@/components/about/count-up"
import { FlipCard } from "@/components/about/flip-card"
import { PathTimeline, type PathStep } from "@/components/about/path-timeline"

const PROGRAMS = [
    { src: "/cs.png", alt: "วิทยาการคอมพิวเตอร์ (Computer Science)" },
    { src: "/it.png", alt: "เทคโนโลยีสารสนเทศ (Information Technology)" },
    { src: "/gis.png", alt: "ภูมิสารสนเทศศาสตร์ (Geoinformatics)" },
    { src: "/cy.png", alt: "ความมั่นคงปลอดภัยไซเบอร์ (Cybersecurity)" },
    { src: "/ai.png", alt: "ปัญญาประดิษฐ์ (Artificial Intelligence)" },
]

const ABOUT_LINES = [
    "เว็บไซต์นี้ถูกสร้างขึ้นเพื่อเป็นพื้นที่กลางสำหรับนักศึกษาสาขาวิทยาการคอมพิวเตอร์ ในการเข้าถึงข้อมูลข่าวสาร กิจกรรม และโอกาสในการพัฒนาตนเองได้อย่างสะดวกและเป็นระบบ",
    "เราต้องการให้เว็บไซต์แห่งนี้เป็น พื้นที่ที่ช่วยให้นักศึกษาได้เรียนรู้ ค้นหาตัวเอง และเติบโตไปพร้อมกับสังคมของชาว College of Computing",
    "ผ่านการรวบรวมกิจกรรมต่าง ๆ ที่ช่วยส่งเสริมทั้งความรู้ทางด้านเทคโนโลยีและทักษะที่จำเป็นต่อการทำงานในอนาคต ไม่ว่าจะเป็นการสื่อสาร การทำงานเป็นทีม การบริหารเวลา การคิดวิเคราะห์ และการปรับตัว",
]

const GOAL_LINES = [
    "เราอยากให้นักศึกษาทุกคนสามารถค้นพบความสามารถของตัวเองผ่านการเข้าร่วมกิจกรรม ได้เรียนรู้จากประสบการณ์จริง และสามารถนำทักษะที่ได้รับไปต่อยอดทั้งในการเรียน การทำงาน และการใช้ชีวิต",
    "เพราะเราเชื่อว่า การเติบโตไม่ได้เกิดขึ้นเฉพาะในห้องเรียน แต่เกิดขึ้นจากทุกประสบการณ์ที่เราได้ลงมือทำ",
    "เว็บไซต์นี้จึงถูกสร้างขึ้นเพื่อเป็นอีกหนึ่งพื้นที่ที่จะช่วยเชื่อมโยง “นักศึกษา – กิจกรรม – การเรียนรู้ – และการพัฒนาทักษะ” เข้าด้วยกัน",
]

const STEP_ICON = "h-5 w-5 md:h-6 md:w-6"
const JOURNEY: PathStep[] = [
    {
        title: "เลือกกิจกรรมที่ใช่",
        desc: "ดูกิจกรรมทั้งหมดของวิทยาลัย พร้อมดูว่าแต่ละกิจกรรมพัฒนา Soft Skills ด้านไหน",
        icon: <CalendarSearch className={STEP_ICON} aria-hidden="true" />,
    },
    {
        title: "ลงทะเบียนเข้าร่วม",
        desc: "สมัครเข้าร่วมกิจกรรมได้ในไม่กี่คลิก และติดตามสถานะการลงทะเบียนของคุณได้ตลอด",
        icon: <ClipboardCheck className={STEP_ICON} aria-hidden="true" />,
    },
    {
        title: "เช็กอินหน้างาน",
        desc: "ยืนยันการเข้าร่วมตัวจริงในวันจัดกิจกรรม เพื่อให้ได้รับสิทธิ์สะสมคะแนน",
        icon: <QrCode className={STEP_ICON} aria-hidden="true" />,
    },
    {
        title: "ประเมินและสะสมคะแนน",
        desc: "ประเมินกิจกรรม แล้วดูคะแนน Soft Skills ที่สะสมเพิ่มขึ้นในโปรไฟล์ของคุณ",
        icon: <Trophy className={STEP_ICON} aria-hidden="true" />,
    },
]

function Eyebrow({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
    return (
        <p
            className={`mb-3 flex items-center gap-2.5 font-mono text-sm font-medium tracking-wide text-brand-600 ${center ? "justify-center" : ""}`}
        >
            <span aria-hidden="true">{"//"}</span>
            {children}
        </p>
    )
}

/** กรอบหน้าต่างโค้ดโทนมืด — ใช้ร่วมกันทุกส่วนที่เป็น "ไฟล์" */
function CodeWindow({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={`overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl shadow-fg/10 ${className}`}>
            <div className="flex items-center gap-2 border-b border-slate-700 bg-slate-800 px-4 py-2.5">
                <span className="h-3 w-3 rounded-full bg-red-400/90" aria-hidden="true" />
                <span className="h-3 w-3 rounded-full bg-amber-300/90" aria-hidden="true" />
                <span className="h-3 w-3 rounded-full bg-emerald-400/90" aria-hidden="true" />
                <span className="ml-3 font-mono text-xs text-slate-400">{title}</span>
            </div>
            {children}
        </div>
    )
}

/** เนื้อหาแบบไฟล์ README: เลขบรรทัดทางซ้าย ข้อความทางขวา */
function CodeLines({ lines }: { lines: string[] }) {
    return (
        <ol className="space-y-3 px-5 py-5 text-[15px] leading-relaxed text-slate-200 md:px-6">
            {lines.map((line, i) => (
                <li key={i} className="flex gap-4">
                    <span className="w-5 shrink-0 select-none pt-0.5 text-right font-mono text-xs text-slate-500" aria-hidden="true">
                        {i + 1}
                    </span>
                    <span>{line}</span>
                </li>
            ))}
        </ol>
    )
}

interface AboutSectionsProps {
    /** ปลายทางของปุ่ม "ดูกิจกรรม" — แต่ละพอร์ทัล (public/student/organizer) มีหน้ากิจกรรมของตัวเอง */
    eventsHref?: string
}

/**
 * เนื้อหาหน้า "เกี่ยวกับเรา" — ใช้ร่วมกันทั้ง public (/about), student (/student/about)
 * และ organizer (/organizer/about) เพื่อให้ทั้งสามหน้าตรงกันเสมอ ไม่ต้องแก้ 3 ที่
 * ไม่รวม header/footer — แต่ละหน้าห่อด้วย chrome ของตัวเอง (SiteHeader/AppHeader ต่างกัน)
 */
export function AboutSections({ eventsHref = "/events" }: AboutSectionsProps) {
    return (
        <>
            {/* Hero: หน้าต่างเทอร์มินัลพิมพ์เอง บนพื้นหลังเคลื่อนไหว (หรือวิดีโอถ้ามี /about-hero.mp4) */}
            <section className="relative isolate flex min-h-[600px] items-center justify-center overflow-hidden px-4 pb-32 pt-20 md:min-h-[680px]">
                <HeroBackdrop />
                <div className="relative z-10 flex w-full flex-col items-center gap-6 text-center">
                    <h1 className="sr-only">Comp Active — College of Computing</h1>
                    <Logo variant="dark" className="text-5xl md:text-7xl" />
                    <TerminalHero />
                    <Link
                        href={eventsHref}
                        className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-semibold text-brand-900 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-brand-50"
                    >
                        ดูกิจกรรมทั้งหมด
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </Link>
                </div>
            </section>

            {/* สถิติ: เขียนเป็นออบเจ็กต์โค้ด ลอยทับขอบล่างของ Hero */}
            <Container className="relative z-10 -mt-16 max-w-3xl">
                <Reveal>
                    <CodeWindow title="college.ts">
                        <dl className="px-5 py-5 font-mono text-sm leading-8 text-slate-300 md:px-6 md:text-base">
                            <p>
                                <span className="text-pink-400">const</span> <span className="text-sky-300">college</span> = {"{"}
                            </p>
                            {[
                                { key: "programs", value: PROGRAMS.length, note: "สาขาวิชา" },
                                { key: "softSkills", value: SOFT_SKILLS.length, note: "Soft Skills ที่ติดตามได้" },
                                { key: "roles", value: 3, note: "นักศึกษา · ผู้จัด · แอดมิน" },
                            ].map((row) => (
                                <div key={row.key} className="flex flex-wrap items-baseline gap-x-2 pl-6">
                                    <dt className="text-emerald-300">{row.key}:</dt>
                                    <dd className="text-amber-300">
                                        <CountUp to={row.value} />,
                                    </dd>
                                    <span className="text-slate-500">{"//"} {row.note}</span>
                                </div>
                            ))}
                            <p>{"}"}</p>
                        </dl>
                    </CodeWindow>
                </Reveal>
            </Container>

            {/* เกี่ยวกับเรา: ภาพ + README.md */}
            <Container className="py-20 md:py-28">
                <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                    <Reveal className="relative">
                        <div
                            className="absolute -bottom-4 -left-4 h-full w-full rounded-3xl bg-gradient-to-br from-brand-100 to-brand-200/40"
                            aria-hidden="true"
                        />
                        <Image
                            src="/college_image.png"
                            alt="วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น"
                            width={1536}
                            height={1024}
                            className="relative h-auto w-full rounded-3xl shadow-xl shadow-fg/10"
                        />
                    </Reveal>

                    <Reveal delay={120}>
                        <Eyebrow>เกี่ยวกับเรา</Eyebrow>
                        <h2 className="mb-6 text-3xl font-bold leading-tight tracking-tight text-fg md:text-4xl">
                            พื้นที่กลางของชาว
                            <br className="hidden md:block" />
                            College of Computing
                        </h2>
                        <CodeWindow title="README.md">
                            <CodeLines lines={ABOUT_LINES} />
                        </CodeWindow>
                    </Reveal>
                </div>
            </Container>

            {/* 12 Soft Skills: การ์ดพลิก 3D */}
            <section className="border-t border-border bg-surface py-20 md:py-28">
                <Container>
                    <Reveal className="mb-12 text-center">
                        <Eyebrow center>ทักษะที่เราพัฒนา</Eyebrow>
                        <h2 className="text-3xl font-bold tracking-tight text-fg md:text-4xl">
                            {SOFT_SKILLS.length} Soft Skills จากทุกกิจกรรมที่เข้าร่วม
                        </h2>
                        <p className="mt-3 text-sm text-fg-subtle">วางเมาส์หรือแตะที่การ์ดเพื่อพลิกดูรายละเอียด</p>
                    </Reveal>

                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {SOFT_SKILLS.map((skill, i) => {
                            const Icon = skill.icon
                            return (
                                <li key={skill.value}>
                                    <Reveal delay={(i % 4) * 80}>
                                        <FlipCard
                                            front={
                                                <>
                                                    <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                                                        <Icon className="h-5 w-5" aria-hidden="true" />
                                                    </span>
                                                    <span className="text-base font-semibold leading-snug text-fg">{skill.label}</span>
                                                    <span className="mt-1 font-mono text-xs font-medium text-brand-600">{skill.labelEn}</span>
                                                </>
                                            }
                                            back={
                                                <>
                                                    <span className="mb-2 font-mono text-xs text-brand-200">{skill.labelEn}</span>
                                                    <span className="text-base leading-relaxed">{skill.desc}</span>
                                                </>
                                            }
                                        />
                                    </Reveal>
                                </li>
                            )
                        })}
                    </ul>
                </Container>
            </section>

            {/* เส้นทางของนักศึกษา: ไทม์ไลน์เส้นเชื่อม */}
            <section className="border-t border-border py-20 md:py-28">
                <Container>
                    <Reveal className="mb-14 text-center">
                        <Eyebrow center>เส้นทางของนักศึกษา</Eyebrow>
                        <h2 className="text-3xl font-bold tracking-tight text-fg md:text-4xl">จากการเลือกกิจกรรม สู่การเติบโต</h2>
                    </Reveal>
                    <PathTimeline steps={JOURNEY} />
                </Container>
            </section>

            {/* สไลด์โชว์สาขาวิชา — เลื่อนวนไม่รู้จบ */}
            <section className="border-t border-border bg-surface py-20 md:py-28">
                <Container>
                    <Reveal className="mb-10 text-center">
                        <Eyebrow center>หลักสูตรของเรา</Eyebrow>
                        <h2 className="text-3xl font-bold tracking-tight text-fg md:text-4xl">
                            {PROGRAMS.length} สาขาวิชาในวิทยาลัยการคอมพิวเตอร์
                        </h2>
                    </Reveal>

                    <div className="overflow-hidden py-4">
                        <div className="flex w-max animate-marquee gap-6 hover:[animation-play-state:paused] motion-reduce:animate-none">
                            {PROGRAMS.map((program) => (
                                <div
                                    key={program.src}
                                    className="w-72 shrink-0 overflow-hidden rounded-2xl border border-border shadow-md transition duration-300 hover:scale-[1.03] hover:shadow-xl"
                                >
                                    <Image
                                        src={program.src}
                                        alt={program.alt}
                                        width={1536}
                                        height={1024}
                                        className="h-auto w-full object-cover"
                                    />
                                </div>
                            ))}
                            {PROGRAMS.map((program) => (
                                <div
                                    key={`${program.src}-dup`}
                                    aria-hidden="true"
                                    className="w-72 shrink-0 overflow-hidden rounded-2xl border border-border shadow-md transition duration-300 hover:scale-[1.03] hover:shadow-xl"
                                >
                                    <Image
                                        src={program.src}
                                        alt=""
                                        width={1536}
                                        height={1024}
                                        className="h-auto w-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </Container>
            </section>

            {/* เป้าหมายของเรา — goal.md + ภาพ (สลับฝั่งกับส่วน "เกี่ยวกับเรา") */}
            <section className="border-t border-border py-20 md:py-28">
                <Container>
                    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                        <Reveal className="lg:order-2">
                            <Image
                                src="/goal.png"
                                alt="เป้าหมายของ Comp Active"
                                width={1672}
                                height={940}
                                className="h-auto w-full rounded-3xl shadow-xl shadow-fg/10"
                            />
                        </Reveal>

                        <Reveal delay={120} className="lg:order-1">
                            <Eyebrow>เป้าหมายของเรา</Eyebrow>
                            <CodeWindow title="goal.md">
                                <CodeLines lines={GOAL_LINES} />
                            </CodeWindow>
                        </Reveal>
                    </div>
                </Container>
            </section>

            {/* CTA ปิดท้าย: บรรทัดคำสั่ง */}
            <section className="relative isolate overflow-hidden bg-brand-900 py-16 md:py-20">
                <div
                    className="absolute -right-20 -top-20 h-72 w-72 animate-about-drift rounded-full bg-brand-500/40 blur-3xl motion-reduce:animate-none"
                    aria-hidden="true"
                />
                <Container className="relative text-center">
                    <Reveal>
                        <p className="font-mono text-sm text-brand-200" aria-hidden="true">
                            $ npm run start-your-journey
                        </p>
                        <h2 className="mt-3 text-2xl font-bold text-white md:text-3xl">พร้อมเริ่มพัฒนาทักษะของคุณแล้วหรือยัง?</h2>
                        <p className="mx-auto mt-3 max-w-lg text-white/70">
                            เลือกกิจกรรมที่ใช่ แล้วสะสมประสบการณ์ไปพร้อมกับชาว College of Computing
                        </p>
                        <Link
                            href={eventsHref}
                            className="group mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-brand-900 transition hover:-translate-y-0.5 hover:bg-brand-50"
                        >
                            เริ่มต้นเลย
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                        </Link>
                    </Reveal>
                </Container>
            </section>
        </>
    )
}
