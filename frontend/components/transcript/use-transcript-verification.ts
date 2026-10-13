// components/transcript/use-transcript-verification.ts
"use client"

import { useEffect, useState } from "react"
import { skillTranscriptsAPI } from "@/lib/api"
import { decodeCodeParam, normalizeTranscriptCode, type VerifyResult } from "@/lib/transcript"

export type VerificationPhase = "loading" | "valid" | "revoked" | "not_found" | "unavailable"

/**
 * เรียก verify แล้วแยกผลให้ชัด — "ตรวจสอบไม่ได้ชั่วคราว" (เครือข่าย/เซิร์ฟเวอร์ล่ม, 429) ต้องไม่ถูกแสดงเป็น "ไม่พบเอกสาร"
 * ไม่งั้นผู้ตรวจจะเข้าใจผิดว่าเอกสารของจริงเป็นเอกสารปลอม
 */
export function useTranscriptVerification(rawCode: string): { phase: VerificationPhase; result: VerifyResult | null } {
    const [state, setState] = useState<{ phase: VerificationPhase; result: VerifyResult | null }>({
        phase: "loading",
        result: null,
    })

    useEffect(() => {
        let cancelled = false
        const code = normalizeTranscriptCode(decodeCodeParam(rawCode))

        if (!code) {
            // ผิดรูปแบบ → ไม่ต้องเสียคำขอ (ทำใน microtask ไม่ setState ตรงใน effect body)
            queueMicrotask(() => !cancelled && setState({ phase: "not_found", result: { status: "not_found" } }))
            return () => {
                cancelled = true
            }
        }

        skillTranscriptsAPI
            .verify(code)
            .then((result) => !cancelled && setState({ phase: result.status, result }))
            .catch(() => !cancelled && setState({ phase: "unavailable", result: null }))

        return () => {
            cancelled = true
        }
    }, [rawCode])

    return state
}
