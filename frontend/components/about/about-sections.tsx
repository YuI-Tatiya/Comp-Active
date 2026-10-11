import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CalendarPlus, Check, GraduationCap, ShieldCheck, type LucideIcon } from "lucide-react"
import { Container } from "@/components/layout/container"
import { AMBER_BUTTON, DenimHero, DenimSectionHeading, TerminalPrompt } from "@/components/denim/denim-ui"
import { SOFT_SKILLS } from "@/lib/soft-skills"
import { cn } from "@/lib/utils"

/** สาขาวิชา — ภาพปกเป็นภาพประจำสาขา (public/*.png) ป้ายสั้นมุมซ้ายบนตามดีไซน์ */
const PROGRAMS = [
    { tag: "CS", th: "วิทยาการคอมพิวเตอร์", en: "Computer Science", src: "/cs.png" },
    { tag: "IT", th: "เทคโนโลยีสารสนเทศ", en: "Information Technology", src: "/it.png" },
    { tag: "GIS", th: "ภูมิสารสนเทศศาสตร์", en: "Geoinformatics", src: "/gis.png" },
    { tag: "CYBER", th: "ความมั่นคงปลอดภัยไซเบอร์", en: "Cybersecurity", src: "/cy.png" },
    { tag: "AI", th: "ปัญญาประดิษฐ์", en: "Artificial Intelligence", src: "/ai.png" },
]

type Role = "student" | "organizer" | "admin"

/** ความสามารถของระบบแยกตามบทบาท — ให้ตรงกับฟีเจอร์ที่มีอยู่จริงเท่านั้น */
const ROLES: { role: Role; icon: LucideIcon; title: string; items: string[] }[] = [
    {
        role: "student",
        icon: GraduationCap,
        title: "นักศึกษา",
        items: [
            "ค้นหาและลงทะเบียนเข้าร่วมกิจกรรม",
            "สะสมคะแนน Soft Skills 12 ด้านจากการเข้าร่วมกิจกรรม",
            "ติดตามผลการประเมินและความก้าวหน้าของตนเอง",
        ],
    },
    {
        role: "organizer",
        icon: CalendarPlus,
        title: "ผู้จัดกิจกรรม",
        items: [
            "สร้างกิจกรรมและกำหนดทักษะที่ผู้เข้าร่วมจะได้รับ",
            "ตรวจสอบรายชื่อและเช็กอินผู้เข้าร่วม",
            "ประเมินผลและดูสรุปความคิดเห็นของกิจกรรม",
        ],
    },
    {
        role: "admin",
        icon: ShieldCheck,
        title: "ผู้ดูแลระบบ",
        items: ["อนุมัติและจัดการบัญชีผู้จัดกิจกรรม", "จัดการเนื้อหาหน้าแรกของระบบ", "ดูภาพรวมและสถิติการใช้งาน"],
    },
]

/** บรรทัดในการ์ดเทอร์มินัล "--mission" */
const MISSION = [
    { cmd: "learn", text: "เรียนรู้" },
    { cmd: "explore", text: "ค้นหาตัวเอง" },
    { cmd: "grow", text: "เติบโตไปด้วยกัน" },
]

const pad = (n: number) => String(n).padStart(2, "0")

interface AboutSectionsProps {
    /** ปลายทางของปุ่ม "ดูกิจกรรม" — แต่ละพอร์ทัล (public/student/organizer) มีหน้ากิจกรรมของตัวเอง */
    eventsHref?: string
    /** การ์ดบทบาทที่เน้น (พื้นยีนส์) — บทบาทของผู้ที่กำลังดู ตามดีไซน์ที่เน้นการ์ดของพอร์ทัลนั้น */
    highlightRole?: Role
}

/**
 * เนื้อหาหน้า "เกี่ยวกับเรา" (ธีม Denim Varsity) — ใช้ร่วมกันทั้ง public (/about), student (/student/about)
 * และ organizer (/organizer/about) เพื่อให้ทั้งสามหน้าตรงกันเสมอ ไม่ต้องแก้ 3 ที่
 * ไม่รวม header/footer — แต่ละหน้าห่อด้วย chrome ของตัวเอง (SiteHeader/AppHeader ต่างกัน)
 */
export function AboutSections({ eventsHref = "/events", highlightRole = "student" }: AboutSectionsProps) {
    return (
        <div className="bg-denim-paper font-plex text-denim-deep">
            <AboutHero eventsHref={eventsHref} />

            {/* ── 01 ความเป็นมา ──────────────────────────────────────────────── */}
            <section aria-labelledby="about-why" className="bg-white">
                <Container className="grid items-center gap-12 py-20 lg:grid-cols-[1.15fr_1fr]">
                    <div className="flex flex-col gap-5">
                        <DenimSectionHeading
                            id="about-why"
                            comment="01 · why we built this"
                            title={
                                <>
                                    พื้นที่กลางของชาว
                                    <br />
                                    College of Computing
                                </>
                            }
                        />
                        <div className="space-y-4 text-[15px] leading-[1.8] text-denim-muted">
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
                    <MissionTerminal />
                </Container>
            </section>

            {/* ── 02 ระบบนี้ทำอะไรได้บ้าง ────────────────────────────────────── */}
            <section aria-labelledby="about-roles">
                <Container className="flex flex-col gap-8 py-20">
                    <DenimSectionHeading
                        id="about-roles"
                        comment="02 · features by role"
                        title="ระบบนี้ทำอะไรได้บ้าง"
                        description="การใช้งานหลักแยกตามบทบาทของผู้ใช้"
                    />
                    <ul className="grid gap-5 md:grid-cols-3">
                        {ROLES.map(({ role, icon: Icon, title, items }) => {
                            const active = role === highlightRole
                            return (
                                <li
                                    key={role}
                                    className={cn(
                                        "flex flex-col gap-4 rounded-[20px] p-6",
                                        active
                                            ? "denim-weave text-white shadow-[0_18px_40px_-18px_rgb(18_34_61_/_0.6)] md:-translate-y-2"
                                            : "border border-denim-line bg-white"
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span
                                            className={cn(
                                                "grid size-11 place-items-center rounded-xl",
                                                active ? "bg-amber text-denim-deep" : "bg-denim-chip text-denim"
                                            )}
                                        >
                                            <Icon className="size-5" aria-hidden="true" />
                                        </span>
                                        <span className={cn("font-code text-xs", active ? "text-denim-on-soft" : "text-denim-muted")}>
                                            role: {role}
                                        </span>
                                    </div>
                                    <h3 className={cn("font-display text-xl font-bold", active ? "text-white" : "text-denim-deep")}>
                                        {title}
                                    </h3>
                                    <ul className="flex flex-col gap-2.5">
                                        {items.map((item) => (
                                            <li
                                                key={item}
                                                className={cn("flex gap-2.5 text-sm leading-relaxed", active ? "text-denim-on" : "text-denim-muted")}
                                            >
                                                <Check
                                                    className={cn("mt-0.5 size-4 shrink-0", active ? "text-amber" : "text-denim-accent")}
                                                    aria-hidden="true"
                                                />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            )
                        })}
                    </ul>
                </Container>
            </section>

            {/* ── 03 Soft Skills 12 ด้าน ─────────────────────────────────────── */}
            <section aria-labelledby="about-skills" className="bg-white">
                <Container className="flex flex-col gap-8 py-20">
                    <DenimSectionHeading
                        id="about-skills"
                        comment={`03 · skills[${SOFT_SKILLS.length}]`}
                        title={
                            <>
                                Soft Skills <span className="text-denim-accent">{SOFT_SKILLS.length}</span> ด้าน
                            </>
                        }
                        description="ทักษะที่ระบบใช้ประเมินผลจากการเข้าร่วมกิจกรรม"
                    />
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {SOFT_SKILLS.map((skill, i) => (
                            <li
                                key={skill.value}
                                className="flex items-start gap-3 rounded-[16px] border border-denim-line bg-white p-4 shadow-[0_4px_0_var(--color-denim-line)]"
                            >
                                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-denim-chip text-denim">
                                    <skill.icon className="size-[18px]" aria-hidden="true" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="font-display text-sm font-bold leading-snug text-denim-deep">{skill.label}</p>
                                    <p className="mt-1 text-xs leading-snug text-denim-muted">{skill.labelEn}</p>
                                </div>
                                <span className="font-code text-xs text-denim-accent">{pad(i + 1)}</span>
                            </li>
                        ))}
                    </ul>
                </Container>
            </section>

            {/* ── 04 สาขาวิชา (แถบยีนส์เข้ม) ─────────────────────────────────── */}
            <section aria-labelledby="about-majors" className="denim-weave-deep">
                <div className="checker-strip h-3.5" aria-hidden="true" />
                <Container className="flex flex-col gap-8 py-20">
                    <DenimSectionHeading
                        id="about-majors"
                        tone="dark"
                        comment={`04 · majors.length = ${PROGRAMS.length}`}
                        title="สาขาวิชาในวิทยาลัยการคอมพิวเตอร์"
                        description={`${PROGRAMS.length} สาขาวิชา`}
                    />
                    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
                        {PROGRAMS.map((program) => (
                            <li
                                key={program.tag}
                                className="flex flex-col overflow-hidden rounded-[18px] border border-white/10 bg-denim/80"
                            >
                                <div className="relative aspect-[3/2] overflow-hidden">
                                    <Image
                                        src={program.src}
                                        alt=""
                                        fill
                                        sizes="(min-width: 1024px) 240px, (min-width: 768px) 33vw, 50vw"
                                        className="object-cover"
                                    />
                                    <span className="absolute left-3 top-3 rounded-md bg-white px-2 py-0.5 font-code text-[11px] font-semibold text-denim-deep">
                                        {program.tag}
                                    </span>
                                    <div className="absolute inset-x-3 bottom-0 border-t-2 border-dashed border-amber/70" aria-hidden="true" />
                                </div>
                                <div className="flex flex-col gap-1 p-4">
                                    <h3 className="font-display text-[15px] font-bold leading-snug text-white">{program.th}</h3>
                                    <p className="text-xs text-denim-on-soft">{program.en}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Container>
                <div className="checker-strip h-3.5" aria-hidden="true" />
            </section>

            {/* ── 05 เป้าหมายของเรา ──────────────────────────────────────────── */}
            <section aria-labelledby="about-goal">
                <Container className="grid items-center gap-12 py-20 lg:grid-cols-2">
                    <div className="flex flex-col gap-5">
                        <DenimSectionHeading id="about-goal" comment="05 · our goal" title="เป้าหมายของเรา" />
                        <p className="text-[15px] leading-[1.8] text-denim-muted">
                            เราอยากให้นักศึกษาทุกคนสามารถค้นพบความสามารถของตัวเองผ่านการเข้าร่วมกิจกรรม
                            ได้เรียนรู้จากประสบการณ์จริง และสามารถนำทักษะที่ได้รับไปต่อยอดทั้งในการเรียน
                            การทำงาน และการใช้ชีวิต
                        </p>
                        <blockquote className="rounded-[16px] border-2 border-dashed border-amber/60 bg-white px-6 py-5 font-display text-lg font-bold leading-relaxed text-denim-deep">
                            เพราะเราเชื่อว่า การเติบโตไม่ได้เกิดขึ้นเฉพาะในห้องเรียน แต่เกิดขึ้นจากทุกประสบการณ์ที่เราได้ลงมือทำ
                        </blockquote>
                        <p className="text-[15px] leading-[1.8] text-denim-muted">
                            เว็บไซต์นี้จึงถูกสร้างขึ้นเพื่อเป็นอีกหนึ่งพื้นที่ที่จะช่วยเชื่อมโยง
                            &ldquo;นักศึกษา – กิจกรรม – การเรียนรู้ – และการพัฒนาทักษะ&rdquo; เข้าด้วยกัน
                        </p>
                    </div>
                    <div className="rounded-[24px] border-2 border-dashed border-denim-dash p-2.5">
                        <Image
                            src="/goal.png"
                            alt="เป้าหมายของ Comp Active — นักศึกษาก้าวไปข้างหน้าพร้อมกิจกรรมและทักษะรอบตัว"
                            width={1672}
                            height={940}
                            sizes="(min-width: 1024px) 600px, 100vw"
                            className="h-auto w-full rounded-[18px]"
                        />
                    </div>
                </Container>
            </section>
        </div>
    )
}

/** แถบหัวหน้า — ข้อความ + กรอบภาพวิทยาลัยเส้นประอำพัน โดยมีมาสคอตยืนหน้ากรอบ (จอ lg+) */
function AboutHero({ eventsHref }: { eventsHref: string }) {
    return (
        <DenimHero className="flex flex-wrap items-center justify-between gap-x-10 gap-y-10 pb-12 sm:pb-14">
            <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-5">
                <TerminalPrompt>~/comp-active $ cat README.md</TerminalPrompt>
                <h1 className="font-display text-[44px] font-bold leading-[1.08] tracking-[-0.015em] text-white sm:text-[56px] xl:text-[64px]">
                    เกี่ยวกับ
                    <span className="block text-amber">Comp Active</span>
                </h1>
                <p className="max-w-[460px] text-base leading-relaxed text-denim-on sm:text-lg">
                    ระบบบริหารกิจกรรมและติดตามทักษะ Soft Skills ของนักศึกษา วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น
                </p>
                <div>
                    <Link href={eventsHref} className={AMBER_BUTTON}>
                        ดูกิจกรรม
                        <ArrowRight className="size-[18px]" aria-hidden="true" />
                    </Link>
                </div>
            </div>

            <div className="relative w-full max-w-[540px] lg:pl-16">
                <div className="rounded-[22px] border-2 border-dashed border-amber/55 p-2.5">
                    <Image
                        src="/college_image.png"
                        alt="ป้ายวิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น"
                        width={1536}
                        height={1024}
                        sizes="(min-width: 1024px) 520px, 100vw"
                        priority
                        className="h-auto w-full rounded-[16px]"
                    />
                </div>
                {/* มาสคอตยืนหน้ามุมซ้ายล่างของกรอบ — ตกแต่งล้วน */}
                <Image
                    src="/mascot-wave.png"
                    alt=""
                    aria-hidden="true"
                    width={421}
                    height={900}
                    sizes="120px"
                    className="mascot-bob absolute -bottom-12 left-0 hidden h-[260px] w-auto drop-shadow-[0_16px_24px_rgb(0_0_0_/_0.4)] lg:block"
                />
            </div>
        </DenimHero>
    )
}

/** การ์ดเทอร์มินัล "comp-active --mission" ข้างข้อความความเป็นมา */
function MissionTerminal() {
    return (
        <div className="denim-weave-deep overflow-hidden rounded-[20px] shadow-[0_24px_50px_-24px_rgb(18_34_61_/_0.7)]">
            <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3.5">
                <span className="size-2.5 rounded-full bg-amber" aria-hidden="true" />
                <span className="size-2.5 rounded-full bg-denim-on-soft" aria-hidden="true" />
                <span className="size-2.5 rounded-full bg-denim-accent" aria-hidden="true" />
                <span className="ml-2 font-code text-xs text-denim-on-soft">dekcom@kku: ~</span>
            </div>
            <div className="flex flex-col gap-2.5 px-5 py-6 font-code text-sm">
                <p className="text-white">
                    <span className="text-amber">$</span> comp-active <span className="text-denim-on-soft">--mission</span>
                </p>
                {MISSION.map((line) => (
                    <p key={line.cmd} className="grid grid-cols-[1.5rem_6rem_1fr] text-denim-on">
                        <span className="text-denim-on-muted" aria-hidden="true">
                            ›
                        </span>
                        <span>{line.cmd}</span>
                        <span className="text-amber">✓ {line.text}</span>
                    </p>
                ))}
                <p className="mt-1 text-denim-on-muted">{"// with College of Computing"}</p>
            </div>
        </div>
    )
}
