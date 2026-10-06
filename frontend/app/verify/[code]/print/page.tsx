// app/verify/[code]/print/page.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SkillTranscriptDocument } from "@/components/transcript/skill-transcript-document"
import { useTranscriptVerification } from "@/components/transcript/use-transcript-verification"
import { formatTranscriptCode } from "@/lib/transcript"

/**
 * หน้าพิมพ์เอกสาร — เอกสารล้วน (ไม่มี header/footer ของพอร์ทัล) เรียก window.print() อัตโนมัติครั้งเดียวเมื่อพร้อม
 * เอกสารที่ยกเลิก/ไม่พบ/ตรวจสอบไม่ได้ จะ "ไม่พิมพ์" และแสดงสถานะแทน
 */
export default function PrintTranscriptPage() {
    const { code: rawCode } = useParams<{ code: string }>()
    const { phase, result } = useTranscriptVerification(rawCode)
    const [origin, setOrigin] = useState("")
    const printed = useRef(false)

    useEffect(() => {
        const raf = requestAnimationFrame(() => setOrigin(window.location.origin))
        return () => cancelAnimationFrame(raf)
    }, [])

    const ready = phase === "valid" && origin !== ""

    useEffect(() => {
        if (!ready || printed.current) return
        printed.current = true
        // รอฟอนต์ + เฟรมที่วาดกราฟ/QR เสร็จ ก่อนเปิดหน้าต่างพิมพ์
        document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => window.print())))
    }, [ready])

    if (phase === "loading" || (phase === "valid" && !ready)) {
        return (
            <main className="flex min-h-screen items-center justify-center gap-2 font-sans text-fg-muted">
                <Loader2 className="size-5 animate-spin" aria-hidden="true" /> กำลังเตรียมเอกสาร...
            </main>
        )
    }

    if (phase !== "valid" || result?.status !== "valid") {
        const message =
            phase === "revoked"
                ? "เอกสารนี้ถูกยกเลิกแล้ว จึงไม่สามารถพิมพ์ได้"
                : phase === "unavailable"
                  ? "ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ในขณะนี้ กรุณารีเฟรชหน้านี้อีกครั้ง"
                  : "ไม่พบเอกสารตามเลขที่นี้"
        return <main className="flex min-h-screen items-center justify-center p-6 text-center font-sans text-fg-muted">{message}</main>
    }

    return (
        <main className="bg-surface py-6 font-sans print:bg-white print:py-0">
            <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-4 rounded-xl border border-border bg-bg px-4 py-3 print:hidden">
                <p className="text-sm text-fg-muted">
                    ในหน้าต่างพิมพ์ ให้เลือกปลายทางเป็น <strong className="text-fg">“บันทึกเป็น PDF”</strong> (Save as PDF)
                </p>
                <Button type="button" size="sm" onClick={() => window.print()}>
                    <Printer aria-hidden="true" /> พิมพ์อีกครั้ง
                </Button>
            </div>
            <SkillTranscriptDocument
                snapshot={result.snapshot}
                code={result.code}
                issuedAt={result.issuedAt}
                verifyUrl={`${origin}/verify/${formatTranscriptCode(result.code)}`}
            />
        </main>
    )
}
