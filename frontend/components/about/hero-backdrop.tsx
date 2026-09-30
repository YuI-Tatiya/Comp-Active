"use client"

import { useEffect, useState } from "react"

const GLYPHS = [
    { t: "</>", cls: "left-[8%] top-[18%]", delay: "0s", dur: "9s" },
    { t: "{ }", cls: "left-[82%] top-[14%]", delay: "-3s", dur: "11s" },
    { t: "01", cls: "left-[68%] top-[68%]", delay: "-6s", dur: "10s" },
    { t: "AI", cls: "left-[18%] top-[72%]", delay: "-2s", dur: "12s" },
    { t: "#", cls: "left-[50%] top-[10%]", delay: "-5s", dur: "8s" },
    { t: "=>", cls: "left-[90%] top-[52%]", delay: "-8s", dur: "13s" },
]

const GRID_MASK = "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 80%)"

/**
 * พื้นหลัง Hero แบบ "วิดีโอ" — ชั้นล่างเป็นแอนิเมชัน CSS ที่เล่นเองเสมอ (ไม่ต้องมีไฟล์)
 * ชั้นบนเป็น <video src="/about-hero.mp4"> ที่จะโผล่ก็ต่อเมื่อไฟล์มีจริงและเล่นได้ (canplay)
 * วางไฟล์ที่ frontend/public/about-hero.mp4 เมื่อไรก็ใช้วิดีโอจริงแทนโดยไม่ต้องแก้โค้ด
 * prefers-reduced-motion → ไม่โหลดวิดีโอ และแอนิเมชัน CSS หยุดผ่าน motion-reduce:
 */
export function HeroBackdrop() {
    const [videoReady, setVideoReady] = useState(false)
    const [allowVideo, setAllowVideo] = useState(false)

    useEffect(() => {
        const raf = requestAnimationFrame(() =>
            setAllowVideo(!window.matchMedia("(prefers-reduced-motion: reduce)").matches),
        )
        return () => cancelAnimationFrame(raf)
    }, [])

    return (
        <div className="absolute inset-0 overflow-hidden bg-brand-900" aria-hidden="true">
            {/* ก้อนสีลอยไหล */}
            <div className="absolute -left-24 top-[-10%] h-[28rem] w-[28rem] animate-about-drift rounded-full bg-brand-500/50 blur-3xl motion-reduce:animate-none" />
            <div className="absolute -right-24 bottom-[-15%] h-[32rem] w-[32rem] animate-about-drift-rev rounded-full bg-brand-200/30 blur-3xl motion-reduce:animate-none" />
            <div className="absolute left-1/3 top-1/2 h-72 w-72 animate-about-drift rounded-full bg-cyan-400/20 blur-3xl motion-reduce:animate-none" />

            {/* กริดเลื่อน */}
            <div
                className="absolute inset-0 animate-about-grid opacity-30 motion-reduce:animate-none"
                style={{
                    backgroundImage:
                        "linear-gradient(rgb(255 255 255 / 0.12) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.12) 1px, transparent 1px)",
                    backgroundSize: "56px 56px",
                    maskImage: GRID_MASK,
                    WebkitMaskImage: GRID_MASK,
                }}
            />

            {/* สัญลักษณ์โค้ดลอย */}
            {GLYPHS.map((g) => (
                <span
                    key={g.t}
                    style={{ animationDelay: g.delay, animationDuration: g.dur }}
                    className={`absolute ${g.cls} animate-about-float select-none rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-sm text-white/60 backdrop-blur-sm motion-reduce:animate-none`}
                >
                    {g.t}
                </span>
            ))}

            {allowVideo && (
                <video
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${videoReady ? "opacity-60" : "opacity-0"}`}
                    src="/about-hero.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    onCanPlay={() => setVideoReady(true)}
                    onError={() => setVideoReady(false)}
                />
            )}

            {/* ไล่เงาให้ตัวหนังสืออ่านออกทั้งกรณีมี/ไม่มีวิดีโอ */}
            <div className="absolute inset-0 bg-gradient-to-b from-brand-900/40 via-transparent to-brand-900/80" />
        </div>
    )
}
