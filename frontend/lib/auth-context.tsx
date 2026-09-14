"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { authAPI, User } from "./api"

// ==================== TYPES ====================

interface AuthContextType {
    user: User | null
    // ไม่มี token ให้ที่นี่แล้ว — session อยู่ใน httpOnly cookie ที่ JavaScript อ่านไม่ได้
    isLoading: boolean
    login: (identifier: string, password: string) => Promise<void>
    adminLogin: (email: string, password: string) => Promise<void>
    register: (data: RegisterData) => Promise<void>
    logout: () => Promise<void>
    /** โหลดข้อมูลผู้ใช้ใหม่หลังแก้โปรไฟล์ — ให้ชื่อบน navbar อัปเดตตาม */
    refreshUser: () => Promise<void>
}

interface RegisterData {
    name: string
    email: string
    password: string
    studentId?: string
    phone: string
    educationLevel: string
    program: string
}

// ==================== CONTEXT ====================

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
        const res = await authAPI.login({ identifier, password })
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
            console.error(err)
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
        <AuthContext.Provider value={{ user, isLoading, login, adminLogin, register, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    )
}
