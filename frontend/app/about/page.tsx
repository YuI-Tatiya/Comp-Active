"use client"

import Image from "next/image"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { Container } from "@/components/layout/container"
import { Logo } from "@/components/layout/logo"

const PROGRAMS = [
    { src: "/cs.png", alt: "วิทยาการคอมพิวเตอร์ (Computer Science)" },
    { src: "/it.png", alt: "เทคโนโลยีสารสนเทศ (Information Technology)" },
    { src: "/gis.png", alt: "ภูมิสารสนเทศศาสตร์ (Geoinformatics)" },
    { src: "/cy.png", alt: "ความมั่นคงปลอดภัยไซเบอร์ (Cybersecurity)" },
    { src: "/ai.png", alt: "ปัญญาประดิษฐ์ (Artificial Intelligence)" },
]

export default function AboutPage() {
    return (
        <div className="flex min-h-screen flex-col bg-bg font-sans">
            <SiteHeader />

            {/* Section 1: แบนเนอร์พื้นเปล่า — โลโก้ + แท็กไลน์ */}
            <section className="flex min-h-[420px] items-center justify-center bg-surface">
                <div className="flex flex-col items-center gap-3 px-4 text-center">
                    <Logo className="text-5xl md:text-6xl" />
                    <p className="text-lg font-medium text-fg-muted md:text-xl">College of Computing</p>
                </div>
            </section>

            {/* Section 2: รูปภาพ + คำอธิบาย */}
            <main className="flex-1">
                <Container className="py-20 md:py-28">
                    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                        <Image
                            src="/college_image.png"
                            alt="วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น"
                            width={1536}
                            height={1024}
                            className="h-auto w-full shadow-xl shadow-fg/10"
                        />

                        <div>
                            <p className="mb-3 flex items-center gap-2.5 text-sm font-medium tracking-wide text-brand-600">
                                <span className="h-px w-6 bg-brand-600/40" aria-hidden="true" />
                                เกี่ยวกับเรา
                            </p>
                            <h2 className="text-3xl font-bold leading-tight tracking-tight text-fg md:text-4xl">
                                พื้นที่กลางของชาว
                                <br className="hidden md:block" />
                                College of Computing
                            </h2>
                            <div className="mt-6 space-y-5 text-base leading-relaxed text-fg-muted">
                                <p>
                                    เว็บไซต์นี้ถูกสร้างขึ้นเพื่อเป็นพื้นที่กลางสำหรับนักศึกษาสาขาวิทยาการคอมพิวเตอร์
                                    ในการเข้าถึงข้อมูลข่าวสาร กิจกรรม และโอกาสในการพัฒนาตนเองได้อย่างสะดวกและเป็นระบบ
                                </p>
                                <p>
                                    เราต้องการให้เว็บไซต์แห่งนี้เป็น พื้นที่ที่ช่วยให้นักศึกษาได้เรียนรู้ ค้นหาตัวเอง
                                    และเติบโตไปพร้อมกับสังคมของชาว College of Computing
                                </p>
                                <p>
                                    ผ่านการรวบรวมกิจกรรมต่าง ๆ ที่ช่วยส่งเสริมทั้งความรู้ทางด้านเทคโนโลยีและทักษะที่จำเป็นต่อการทำงานในอนาคต
                                    ไม่ว่าจะเป็นการสื่อสาร การทำงานเป็นทีม การบริหารเวลา การคิดวิเคราะห์ และการปรับตัว
                                </p>
                            </div>
                        </div>
                    </div>
                </Container>

                {/* Section 3: สไลด์โชว์สาขาวิชา — เลื่อนวนไม่รู้จบ เห็นทีละ ~4 ภาพ */}
                <section className="border-t border-border bg-surface py-20 md:py-28">
                    <Container>
                        <div className="mb-10 text-center">
                            <p className="mb-3 flex items-center justify-center gap-2.5 text-sm font-medium tracking-wide text-brand-600">
                                <span className="h-px w-6 bg-brand-600/40" aria-hidden="true" />
                                หลักสูตรของเรา
                                <span className="h-px w-6 bg-brand-600/40" aria-hidden="true" />
                            </p>
                            <h2 className="text-3xl font-bold tracking-tight text-fg md:text-4xl">
                                5 สาขาวิชาในวิทยาลัยการคอมพิวเตอร์
                            </h2>
                        </div>

                        <div className="overflow-hidden">
                            <div className="flex w-max animate-marquee gap-6 hover:[animation-play-state:paused] motion-reduce:animate-none">
                                {PROGRAMS.map((program) => (
                                    <div
                                        key={program.src}
                                        className="w-72 shrink-0 overflow-hidden rounded-2xl border border-border shadow-md"
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
                                        className="w-72 shrink-0 overflow-hidden rounded-2xl border border-border shadow-md"
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

                {/* Section 4: เป้าหมายของเรา — คำอธิบายซ้าย ภาพขวา */}
                <section className="border-t border-border py-20 md:py-28">
                    <Container>
                        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                            <div>
                                <p className="mb-3 flex items-center gap-2.5 text-sm font-medium tracking-wide text-brand-600">
                                    <span className="h-px w-6 bg-brand-600/40" aria-hidden="true" />
                                    เป้าหมายของเรา
                                </p>
                                <div className="space-y-5 text-base leading-relaxed text-fg-muted">
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
                                className="h-auto w-full shadow-xl shadow-fg/10"
                            />
                        </div>
                    </Container>
                </section>
            </main>

            <SiteFooter />
        </div>
    )
}
