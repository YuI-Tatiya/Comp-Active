"use client"

import { useSyncExternalStore } from "react"
import { isScanCapableDevice } from "./device"

// ชนิดอุปกรณ์ไม่เปลี่ยนระหว่างใช้งาน จึงไม่มีอะไรให้ subscribe
const subscribe = () => () => {}

const getClientSnapshot = () =>
    isScanCapableDevice({ userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints ?? 0 })

// ฝั่งเซิร์ฟเวอร์ไม่มี navigator — ไม่รู้ค่า
const getServerSnapshot = (): boolean | null => null

/**
 * อุปกรณ์นี้สแกน QR เช็คอินได้ไหม — null = ยังไม่รู้ (ตอน SSR)
 * ใช้ useSyncExternalStore เพื่อให้ HTML ฝั่งเซิร์ฟเวอร์ (null) กับตอน hydrate ตรงกัน แล้วค่อยเปลี่ยนเป็นค่าจริงฝั่ง client
 */
export function useScanCapable(): boolean | null {
    return useSyncExternalStore<boolean | null>(subscribe, getClientSnapshot, getServerSnapshot)
}
