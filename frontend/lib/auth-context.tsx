"use client"

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { ApiError, authAPI, User } from "./api"
import { SESSION_CHECK_EVENT } from "./api-error"

// ==================== TYPES ====================

interface AuthContextType {
    user: User | null
    // ไม่มี token ให้ที่นี่แล้ว — session อยู่ใน httpOnly cookie ที่ JavaScript อ่านไม่ได้
    isLoading: boolean
    login: (identifier: string, password: string) => Promise<void>
    adminLogin: (email: string, password: string) => Promise<void>
    /** สมัครสมาชิกยังไม่เข้าสู่ระบบ — พาไปหน้ากรอก OTP ต่อ (ดู verifyRegisterOtp) */
    register: (data: RegisterData) => Promise<void>
    /**
     * ยืนยัน OTP ที่ส่งไปตอนสมัคร — สำเร็จแล้วถึงเข้าสู่ระบบจริง
     * ไม่ส่ง password = ใช้รหัสผ่านที่แท็บนี้จำไว้จาก register()/login() เมื่อกี้ (ดู hasPendingRegistration)
     */
    verifyRegisterOtp: (email: string, otp: string, password?: string) => Promise<void>
    /** แท็บนี้จำรหัสผ่านของคำขอสมัครอีเมลนี้ไว้ไหม — ถ้าไม่ หน้า OTP ต้องถามรหัสผ่านเอง */
    hasPendingRegistration: (email: string) => boolean
    logout: () => Promise<void>
    /** โหลดข้อมูลผู้ใช้ใหม่หลังแก้โปรไฟล์ — ให้ชื่อบน navbar อัปเดตตาม */
    refreshUser: () => Promise<void>
}

interface RegisterData {
    title: "mr" | "miss"
    name: string
    email: string
    password: string
    studentId?: string
    phone: string
    educationLevel: string
    program: string
}

// ==================== CONTEXT ====================

/**
 * ส่วนหนึ่งของ AUTH_ERRORS.ACCOUNT_NOT_VERIFIED ฝั่ง backend — ไม่มี error code แบบมีโครงสร้างให้เช็ค
 * จึงจับคู่ด้วยข้อความ (login-form ใช้ค่าเดียวกันนี้)
 */
export const ACCOUNT_NOT_VERIFIED_HINT = "ยังไม่ได้ยืนยันอีเมล"

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider")
    }
    return context
}

// ==================== PROVIDER ====================

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    // รหัสผ่านของคำขอสมัครที่รอ OTP — backend ต้องการคู่กับ OTP จึงจำไว้ให้หน้า OTP ไม่ต้องถามซ้ำ
    // อยู่ในหน่วยความจำของแท็บนี้เท่านั้น ไม่ลง storage ใดๆ (รีเฟรช = หาย หน้า OTP จะถามรหัสผ่านเอง)
    const pendingRegistration = useRef<{ email: string; password: string } | null>(null)

    // token อยู่ใน httpOnly cookie ที่ JavaScript อ่านไม่ได้ (กัน XSS ขโมย session)
    // จึงเช็คสถานะล็อกอินด้วยการถาม backend ตรง ๆ — ถ้า cookie ยังใช้ได้จะได้ profile กลับมา
    useEffect(() => {
        async function loadUser() {
            try {
                setUser(await authAPI.getProfile())
            } catch {
                // ไม่มี cookie หรือหมดอายุแล้ว — ถือว่ายังไม่ได้ล็อกอิน
                setUser(null)
            } finally {
                setIsLoading(false)
            }
        }

        loadUser()
    }, [])

    // ตรวจ session กับ backend ใหม่ — cookie ใช้ร่วมกันทั้งเบราว์เซอร์ ถ้าอีกแท็บล็อกอินบัญชีอื่นหรือ session หมดอายุ
    // แท็บนี้ต้องรู้ตัว: ได้ผู้ใช้คนใหม่ → RoleGuard พาไปพอร์ทัลของ role นั้นเอง, หมดอายุ (401) → RoleGuard พาไป /auth
    // เครือข่ายล่มหรือ 5xx ไม่ถือว่าออกจากระบบ (คงผู้ใช้เดิมไว้)
    const lastCheck = useRef(0)
    const inFlight = useRef(false)
    useEffect(() => {
        async function revalidate(minIntervalMs: number) {
            const now = Date.now()
            if (inFlight.current || now - lastCheck.current < minIntervalMs) return
            inFlight.current = true
            lastCheck.current = now
            try {
                const profile = await authAPI.getProfile()
                setUser((prev) => (prev && prev.id === profile.id && prev.role === profile.role ? prev : profile))
            } catch (err) {
                if (err instanceof ApiError && err.status === 401) setUser(null)
            } finally {
                inFlight.current = false
            }
        }

        // API ตอบ 401/403 จาก guard (ส่งมาจาก fetchAPI) → ตรวจทันที (กันยิงซ้อนภายใน 2 วินาที)
        const onSessionCheck = () => revalidate(2000)
        // กลับมาที่แท็บ/หน้าต่าง → ตรวจ แต่ไม่ถี่กว่า 15 วินาที
        const onVisible = () => {
            if (document.visibilityState === "visible") revalidate(15000)
        }

        window.addEventListener(SESSION_CHECK_EVENT, onSessionCheck)
        window.addEventListener("focus", onVisible)
        document.addEventListener("visibilitychange", onVisible)
        return () => {
            window.removeEventListener(SESSION_CHECK_EVENT, onSessionCheck)
            window.removeEventListener("focus", onVisible)
            document.removeEventListener("visibilitychange", onVisible)
        }
    }, [])

    function redirectByRole(role: string) {
        switch (role) {
            case "admin":
                router.replace("/admin")
                break
            case "organizer":
                router.replace("/organizer")
                break
            default:
                router.replace("/student")
        }
    }

    async function login(identifier: string, password: string) {
        let res
        try {
            res = await authAPI.login({ identifier, password })
        } catch (err) {
            // backend เช็ครหัสผ่านก่อนสถานะยืนยัน — error นี้แปลว่ารหัสผ่านถูก จำไว้ให้หน้า OTP ไม่ต้องถามซ้ำ
            if (err instanceof ApiError && err.message.includes(ACCOUNT_NOT_VERIFIED_HINT)) {
                pendingRegistration.current = { email: normalizeEmail(identifier), password }
            }
            throw err
        }
        // ไม่เก็บ accessToken ไว้ฝั่ง client — backend ออก httpOnly cookie ให้แล้ว
        // Profile may be in the response or we fetch it
        if (res.user) {
            setUser(res.user)
            redirectByRole(res.user.role)
        } else {
            const profile = await authAPI.getProfile()
            setUser(profile)
            redirectByRole(profile.role)
        }
    }

    // Separate from login(): admin accounts only ever authenticate through the
    // admin subdomain, and always land at its root ("/", rewritten to /admin by middleware).
    async function adminLogin(email: string, password: string) {
        const res = await authAPI.adminLogin({ email, password })
        if (res.user) {
            setUser(res.user)
        } else {
            setUser(await authAPI.getProfile())
        }
        router.replace("/")
    }

    async function register(data: RegisterData) {
        const res = await authAPI.register(data)
        pendingRegistration.current = { email: normalizeEmail(res.email), password: data.password }
        // ยังไม่มี session ให้ที่นี่ (ดู authAPI.register) — พาไปกรอก OTP ต่อแทนการล็อกอินทันที
        router.push(`/auth/verify?email=${encodeURIComponent(res.email)}`)
    }

    function hasPendingRegistration(email: string) {
        return pendingRegistration.current?.email === normalizeEmail(email)
    }

    async function verifyRegisterOtp(email: string, otp: string, password?: string) {
        const remembered = hasPendingRegistration(email) ? pendingRegistration.current?.password : undefined
        const registrationPassword = password ?? remembered
        if (!registrationPassword) throw new Error("กรุณากรอกรหัสผ่านที่ใช้สมัคร")

        const res = await authAPI.verifyRegisterOtp(email, otp, registrationPassword)
        pendingRegistration.current = null
        if (res.user) {
            setUser(res.user)
            redirectByRole(res.user.role)
        } else {
            const profile = await authAPI.getProfile()
            setUser(profile)
            redirectByRole(profile.role)
        }
    }

    async function refreshUser() {
        try {
            setUser(await authAPI.getProfile())
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) setUser(null)
            else console.error(err)
        }
    }

    async function logout() {
        try {
            // httpOnly cookie ลบเองจากฝั่งเบราว์เซอร์ไม่ได้ ต้องให้เซิร์ฟเวอร์สั่งลบ
            await authAPI.logout()
        } catch {
            // ต่อให้เรียกไม่สำเร็จ ก็ต้องเคลียร์สถานะฝั่ง UI ให้ผู้ใช้ออกจากระบบได้เสมอ
        }
        setUser(null)
        await new Promise((r) => setTimeout(r, 400))
        router.replace("/")
    }

    return (
        <AuthContext.Provider
            value={{ user, isLoading, login, adminLogin, register, verifyRegisterOtp, hasPendingRegistration, logout, refreshUser }}
        >
            {children}
        </AuthContext.Provider>
    )
}
