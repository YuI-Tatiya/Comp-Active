"use client"

import { useEffect, useRef } from "react"

const NODE_COUNT_DESKTOP = 46
const NODE_COUNT_MOBILE = 22
const MAX_LINK_DISTANCE = 150
const PARALLAX_STRENGTH = 14 // px offset สูงสุด
const PARALLAX_EASE = 0.02 // ยิ่งน้อยยิ่งตามเมาส์ช้าและนุ่มนวล
const LINK_COLOR = "99, 179, 237" // brand-200 เป็น rgb เพื่อคุม alpha ทีละเฟรม

const PALETTE = ["#bee3f8", "#93c5fd", "#67e8f9", "#a5f3fc", "#7dd3fc"]

interface Node {
    x: number
    y: number
    vx: number
    vy: number
    radius: number
    color: string
    pulseSpeed: number
    pulsePhase: number
}

interface CircuitTrace {
    points: { x: number; y: number }[]
    born: number
    lifespan: number
    color: string
}

/** สุ่มตำแหน่งโดยเลี่ยงโซนกลาง-ซ้าย เพื่อเก็บพื้นที่นั้นไว้ให้ข้อความของหน้า */
function sampleEdgeBiasedPoint(width: number, height: number) {
    const clearLeft = width * 0.06
    const clearRight = width * 0.6
    const clearTop = height * 0.12
    const clearBottom = height * 0.88

    for (let attempt = 0; attempt < 8; attempt++) {
        const x = Math.random() * width
        const y = Math.random() * height
        const inClearZone = x > clearLeft && x < clearRight && y > clearTop && y < clearBottom
        if (!inClearZone) return { x, y }
    }
    // สุ่มไม่โดนขอบหลังลองครบ — บังคับวางที่ริมขวาหรือขอบบน/ล่างแทน
    if (Math.random() < 0.5) {
        return { x: clearRight + Math.random() * (width - clearRight), y: Math.random() * height }
    }
    return {
        x: Math.random() * width,
        y: Math.random() < 0.5 ? Math.random() * clearTop : clearBottom + Math.random() * (height - clearBottom),
    }
}

export function TechMotionBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvasEl = canvasRef.current
        if (!canvasEl) return
        const context = canvasEl.getContext("2d")
        if (!context) return
        const canvas: HTMLCanvasElement = canvasEl
        const ctx: CanvasRenderingContext2D = context

        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

        let width = 0
        let height = 0
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        let nodes: Node[] = []
        let traces: CircuitTrace[] = []
        let mouseTargetX = 0
        let mouseTargetY = 0
        let offsetX = 0
        let offsetY = 0
        let rafId = 0
        let visible = true
        let lastTraceSpawn = 0

        function initNodes() {
            const count = width < 768 ? NODE_COUNT_MOBILE : NODE_COUNT_DESKTOP
            nodes = Array.from({ length: count }, () => {
                const { x, y } = sampleEdgeBiasedPoint(width, height)
                return {
                    x,
                    y,
                    vx: (Math.random() - 0.5) * 0.12,
                    vy: (Math.random() - 0.5) * 0.12,
                    radius: 1.4 + Math.random() * 1.8,
                    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
                    pulseSpeed: 0.0006 + Math.random() * 0.0008,
                    pulsePhase: Math.random() * Math.PI * 2,
                }
            })
        }

        function resize() {
            const parent = canvas.parentElement
            if (!parent) return
            width = parent.clientWidth
            height = parent.clientHeight
            canvas.width = width * dpr
            canvas.height = height * dpr
            canvas.style.width = `${width}px`
            canvas.style.height = `${height}px`
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            initNodes()
        }

        function spawnTrace(time: number) {
            if (traces.length >= 4) return
            const start = sampleEdgeBiasedPoint(width, height)
            const points = [start]
            let cx = start.x
            let cy = start.y
            const horizontalFirst = Math.random() < 0.5
            for (let i = 0; i < 2; i++) {
                const segLen = 18 + Math.random() * 24
                const sign = Math.random() < 0.5 ? -1 : 1
                const horizontal = i === 0 ? horizontalFirst : !horizontalFirst
                if (horizontal) cx += sign * segLen
                else cy += sign * segLen
                points.push({ x: cx, y: cy })
            }
            traces.push({
                points,
                born: time,
                lifespan: 4000 + Math.random() * 3000,
                color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
            })
        }

        function step(time: number) {
            if (!visible) {
                rafId = requestAnimationFrame(step)
                return
            }
            ctx.clearRect(0, 0, width, height)

            offsetX += (mouseTargetX - offsetX) * PARALLAX_EASE
            offsetY += (mouseTargetY - offsetY) * PARALLAX_EASE

            ctx.save()
            ctx.translate(offsetX, offsetY)

            // เส้นบางเรืองแสงเชื่อมโหนดที่อยู่ใกล้กัน
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const a = nodes[i]
                    const b = nodes[j]
                    const dx = a.x - b.x
                    const dy = a.y - b.y
                    const dist = Math.sqrt(dx * dx + dy * dy)
                    if (dist < MAX_LINK_DISTANCE) {
                        const alpha = (1 - dist / MAX_LINK_DISTANCE) * 0.12
                        ctx.strokeStyle = `rgba(${LINK_COLOR}, ${alpha})`
                        ctx.lineWidth = 1
                        ctx.beginPath()
                        ctx.moveTo(a.x, a.y)
                        ctx.lineTo(b.x, b.y)
                        ctx.stroke()
                    }
                }
            }

            // วงจรเล็กๆ ที่ค่อยๆ ปรากฏแล้วจางหายไปเอง
            traces = traces.filter((trace) => time - trace.born < trace.lifespan)
            for (const trace of traces) {
                const age = time - trace.born
                const t = age / trace.lifespan
                const alpha = t < 0.3 ? t / 0.3 : t > 0.7 ? (1 - t) / 0.3 : 1
                ctx.strokeStyle = trace.color
                ctx.globalAlpha = alpha * 0.35
                ctx.lineWidth = 1
                ctx.beginPath()
                trace.points.forEach((p, idx) => {
                    if (idx === 0) ctx.moveTo(p.x, p.y)
                    else ctx.lineTo(p.x, p.y)
                })
                ctx.stroke()
                ctx.globalAlpha = 1
            }

            // โหนดที่เลื่อนช้าๆ พร้อมจังหวะเรืองแสงเบาๆ
            for (const node of nodes) {
                node.x += node.vx
                node.y += node.vy
                if (node.x < -20) node.x = width + 20
                if (node.x > width + 20) node.x = -20
                if (node.y < -20) node.y = height + 20
                if (node.y > height + 20) node.y = -20

                const pulse = 0.55 + 0.45 * Math.sin(time * node.pulseSpeed + node.pulsePhase)
                ctx.beginPath()
                ctx.fillStyle = node.color
                ctx.globalAlpha = 0.35 + pulse * 0.35
                ctx.shadowColor = node.color
                ctx.shadowBlur = 8 + pulse * 6
                ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
                ctx.fill()
                ctx.shadowBlur = 0
                ctx.globalAlpha = 1
            }

            ctx.restore()

            // reduce motion — วาดนิ่งเฟรมเดียว ไม่ต่อคิว rAF และไม่มี parallax/circuit ใหม่
            if (prefersReducedMotion) return

            if (time - lastTraceSpawn > 1500 + Math.random() * 1500) {
                spawnTrace(time)
                lastTraceSpawn = time
            }
            rafId = requestAnimationFrame(step)
        }

        function handleMouseMove(e: MouseEvent) {
            const nx = e.clientX / window.innerWidth - 0.5
            const ny = e.clientY / window.innerHeight - 0.5
            mouseTargetX = -nx * PARALLAX_STRENGTH
            mouseTargetY = -ny * PARALLAX_STRENGTH
        }

        function handleVisibility() {
            visible = document.visibilityState === "visible"
        }

        const resizeObserver = new ResizeObserver(resize)
        resize()
        if (canvas.parentElement) resizeObserver.observe(canvas.parentElement)

        if (!prefersReducedMotion) {
            window.addEventListener("mousemove", handleMouseMove)
            document.addEventListener("visibilitychange", handleVisibility)
        }
        rafId = requestAnimationFrame(step)

        return () => {
            cancelAnimationFrame(rafId)
            resizeObserver.disconnect()
            if (!prefersReducedMotion) {
                window.removeEventListener("mousemove", handleMouseMove)
                document.removeEventListener("visibilitychange", handleVisibility)
            }
        }
    }, [])

    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {/* พื้นหลังไล่สีฟ้าอ่อน-ขาว */}
            <div className="absolute inset-0 bg-gradient-to-b from-bg via-brand-50 to-bg" />

            {/* บลอบเรืองแสงสไตล์ glassmorphism ชิดขอบ ให้ความรู้สึกมีมิติ */}
            <div className="absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-brand-200/30 blur-[100px]" />
            <div className="absolute -right-10 top-1/3 h-[320px] w-[320px] rounded-full bg-cyan-200/25 blur-[90px]" />
            <div className="absolute -bottom-24 -right-16 h-[380px] w-[380px] rounded-full bg-brand-300/20 blur-[110px]" />

            <canvas ref={canvasRef} className="absolute inset-0" />
        </div>
    )
}
