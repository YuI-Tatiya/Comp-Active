// app/verify/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Container } from "@/components/layout/container"
import { normalizeTranscriptCode, formatTranscriptCode } from "@/lib/transcript"

export default function VerifyIndexPage() {
    const router = useRouter()
    const [value, setValue] = useState("")
    const [error, setError] = useState("")

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        const code = normalizeTranscriptCode(value)
        if (!code) {
            setError("รูปแบบรหัสไม่ถูกต้อง รหัสมี 16 ตัวอักษร เช่น 0123-4567-89AB-CDGG")
            return
        }
        router.push(`/verify/${formatTranscriptCode(code)}`)
    }

    return (
        <main className="min-h-screen bg-surface py-16 font-sans">
            <Container className="max-w-lg">
                <div className="rounded-2xl border border-border bg-bg p-8 shadow-xs">
                    <span className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <ShieldCheck className="size-6" aria-hidden="true" />
                    </span>
                    <h1 className="text-2xl font-bold text-fg">ตรวจสอบเอกสารรับรองผล Soft Skills</h1>
                    <p className="mt-1 text-sm text-fg-muted">กรอกเลขที่เอกสารที่ปรากฏบนเอกสาร หรือสแกน QR บนเอกสารโดยตรง</p>

                    <form onSubmit={submit} className="mt-6 space-y-3">
                        <Input
                            value={value}
                            onChange={(e) => {
                                setValue(e.target.value)
                                setError("")
                            }}
                            placeholder="XXXX-XXXX-XXXX-XXXX"
                            aria-label="เลขที่เอกสาร"
                            autoComplete="off"
                            className="font-mono uppercase"
                        />
                        {error && <p className="text-sm text-danger-fg">{error}</p>}
                        <Button type="submit" className="w-full">
                            ตรวจสอบ
                        </Button>
                    </form>
                </div>
            </Container>
        </main>
    )
}
