import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { isScanCapableDevice } from "./device.ts"

const UA = {
    iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    ipad: "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    // iPadOS 13+ ในโหมดเว็บเดสก์ท็อป (ค่าเริ่มต้น) — UA เหมือน Mac ทุกประการ
    ipadDesktopMode: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    androidPhone: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
    androidTablet: "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    macbook: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    linux: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
}

describe("isScanCapableDevice", () => {
    test("โทรศัพท์และ iPad สแกนได้", () => {
        assert.equal(isScanCapableDevice({ userAgent: UA.iphone, maxTouchPoints: 5 }), true)
        assert.equal(isScanCapableDevice({ userAgent: UA.ipad, maxTouchPoints: 5 }), true)
        assert.equal(isScanCapableDevice({ userAgent: UA.androidPhone, maxTouchPoints: 5 }), true)
        assert.equal(isScanCapableDevice({ userAgent: UA.androidTablet, maxTouchPoints: 5 }), true)
    })

    test("iPad ที่ UA ปลอมเป็น Mac แยกได้ด้วยจอสัมผัส", () => {
        assert.equal(isScanCapableDevice({ userAgent: UA.ipadDesktopMode, maxTouchPoints: 5 }), true)
    })

    test("MacBook (ไม่มีจอสัมผัส) สแกนไม่ได้", () => {
        assert.equal(isScanCapableDevice({ userAgent: UA.macbook, maxTouchPoints: 0 }), false)
    })

    test("Windows / Linux notebook และเดสก์ท็อปสแกนไม่ได้ แม้มีจอสัมผัส", () => {
        assert.equal(isScanCapableDevice({ userAgent: UA.windows, maxTouchPoints: 0 }), false)
        assert.equal(isScanCapableDevice({ userAgent: UA.windows, maxTouchPoints: 10 }), false)
        assert.equal(isScanCapableDevice({ userAgent: UA.linux, maxTouchPoints: 0 }), false)
    })

    test("UA ว่างถือว่าไม่ใช่มือถือ", () => {
        assert.equal(isScanCapableDevice({ userAgent: "", maxTouchPoints: 0 }), false)
    })
})
