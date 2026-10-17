"use client"

import { useSyncExternalStore } from "react"
import { isInAppBrowser } from "./device"

// ชนิดเบราว์เซอร์ไม่เปลี่ยนระหว่างใช้งาน จึงไม่มีอะไรให้ subscribe (เหมือน use-scan-capable.ts)
const subscribe = () => () => {}

const getClientSnapshot = () => isInAppBrowser(navigator.userAgent)

// ฝั่งเซิร์ฟเวอร์ไม่มี navigator — ไม่รู้ค่า
const getServerSnapshot = (): boolean | null => null

/**
 * กำลังเปิดอยู่ในเบราว์เซอร์ฝังในแอป (LINE/Facebook/Instagram ฯลฯ) ไหม — null = ยังไม่รู้ (ตอน SSR)
 * ใช้ useSyncExternalStore แบบเดียวกับ useScanCapable เพื่อให้ HTML ฝั่งเซิร์ฟเวอร์กับตอน hydrate ตรงกัน
 */
export function useInAppBrowser(): boolean | null {
    return useSyncExternalStore<boolean | null>(subscribe, getClientSnapshot, getServerSnapshot)
}
