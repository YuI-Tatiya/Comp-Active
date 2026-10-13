// app/verify/[code]/page.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AlertTriangle, CheckCircle2, Loader2, SearchX, ShieldOff } from "lucide-react"
import { Container } from "@/components/layout/container"
import { SkillTranscriptDocument } from "@/components/transcript/skill-transcript-document"
import { useTranscriptVerification } from "@/components/transcript/use-transcript-verification"
import { decodeCodeParam, formatThaiDate, formatTranscriptCode } from "@/lib/transcript"

function StatusBanner({ tone, icon: Icon, title, detail }: { tone: "ok" | "bad" | "warn"; icon: typeof CheckCircle2; title: string; detail?: string }) {
    const styles = {
        ok: "border-success/30 bg-success-bg text-success-fg",
        bad: "border-danger/30 bg-danger-bg text-danger-fg",
        warn: "border-warning/30 bg-warning-bg text-warning",
    }[tone]
    return (
        <div role="status" className={`mb-6 flex items-start gap-3 rounded-xl border p-4 ${styles}`}>
            <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
                <p className="font-semibold">{title}</p>
                {detail && <p className="mt-0.5 text-sm">{detail}</p>}
            </div>
        </div>
    )
}

export default function VerifyPage() {
    const { code: rawCode } = useParams<{ code: string }>()
    const { phase, result } = useTranscriptVerification(rawCode)
    const [origin, setOrigin] = useState("")

    useEffect(() => {
        const raf = requestAnimationFrame(() => setOrigin(window.location.origin))
        return () => cancelAnimationFrame(raf)
    }, [])

    const code = formatTranscriptCode(decodeCodeParam(rawCode))

    return (
        <main className="min-h-screen bg-surface py-10 font-sans print:bg-white print:py-0">
            <Container className="max-w-4xl">
                {phase === "loading" && (
                    <div className="flex items-center justify-center gap-2 py-24 text-fg-muted">
                        <Loader2 className="size-5 animate-spin" aria-hidden="true" /> กำลังตรวจสอบเอกสาร...
                    </div>
                )}

                {phase === "unavailable" && (
                    <StatusBanner
                        tone="warn"
                        icon={AlertTriangle}
                        title="ตรวจสอบไม่ได้ชั่วคราว"
                        detail="ระบบไม่สามารถติดต่อเซิร์ฟเวอร์ได้ในขณะนี้ นี่ไม่ได้หมายความว่าเอกสารไม่ถูกต้อง กรุณารีเฟรชหน้านี้อีกครั้งภายหลัง"
                    />
                )}

                {phase === "not_found" && (
                    <StatusBanner tone="bad" icon={SearchX} title="ไม่พบเอกสาร" detail="ไม่พบเอกสารตามเลขที่นี้ในระบบ กรุณาตรวจสอบเลขที่เอกสารอีกครั้ง" />
                )}

                {phase === "revoked" && result?.status === "revoked" && (
                    <StatusBanner
                        tone="bad"
                        icon={ShieldOff}
                        title="เอกสารนี้ถูกยกเลิกแล้ว"
                        detail={`เลขที่ ${code} ถูกยกเลิกโดยเจ้าของเอกสารเมื่อ ${formatThaiDate(result.revokedAt)} จึงไม่สามารถใช้เป็นหลักฐานได้`}
                    />
                )}

                {phase === "valid" && result?.status === "valid" && (
                    <>
                        <StatusBanner
                            tone="ok"
                            icon={CheckCircle2}
                            title="เอกสารถูกต้อง"
                            detail={`ออกโดยระบบ Comp Active เมื่อ ${formatThaiDate(result.issuedAt)} ข้อมูลด้านล่างคือข้อมูล ณ วันที่ออกเอกสาร กรุณาเทียบกับเอกสารที่ได้รับ`}
                        />
                        <SkillTranscriptDocument
                            snapshot={result.snapshot}
                            code={result.code}
                            issuedAt={result.issuedAt}
                            verifyUrl={`${origin}/verify/${formatTranscriptCode(result.code)}`}
                        />
                    </>
                )}

                <p className="mt-8 text-center text-sm text-fg-muted print:hidden">
                    <Link href="/verify" className="text-brand-600 hover:underline">
                        ตรวจสอบเอกสารฉบับอื่น
                    </Link>
                </p>
            </Container>
        </main>
    )
}
