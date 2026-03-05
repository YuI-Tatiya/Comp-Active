"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { authAPI } from "./api"

// ==================== TYPES ====================

interface User {
    id: number
    name: string
    email: string
    role: "student" | "organizer" | "admin"
    studentId?: string
}

interface AuthContextType {
    user: User | null
    token: string | null
    isLoading: boolean
    login: (email: string, password: string) => Promise<void>
    register: (data: RegisterData) => Promise<void>
    logout: () => void
}

interface RegisterData {
    name: string
    email: string
    password: string
    role: string
    studentId?: string
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
    const [token, setToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    // โหลด user จาก token ที่เก็บไว้ใน localStorage
    useEffect(() => {
        async function loadUser(tkn: string) {
            try {
                localStorage.setItem("token", tkn)
                const profile = await authAPI.getProfile()
                setUser(profile)
            } catch {
                // Token expired or invalid
                localStorage.removeItem("token")
                setToken(null)
                setUser(null)
            } finally {
                setIsLoading(false)
            }
        }

        const savedToken = localStorage.getItem("token")
        if (savedToken) {
            setToken(savedToken)
            loadUser(savedToken)
        } else {
            setIsLoading(false)
        }
    }, [])

    function redirectByRole(role: string) {
        switch (role) {
            case "admin":
                router.push("/admin")
                break
            case "organizer":
                router.push("/organizer")
                break
            default:
                router.push("/student")
        }
    }

    async function login(email: string, password: string) {
        const res = await authAPI.login({ email, password })
        const accessToken = res.accessToken || res.access_token || res.token
        setToken(accessToken)
        localStorage.setItem("token", accessToken)
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

    async function register(data: RegisterData) {
        const res = await authAPI.register(data)
        const accessToken = res.accessToken || res.access_token || res.token
        setToken(accessToken)
        localStorage.setItem("token", accessToken)
        if (res.user) {
            setUser(res.user)
            redirectByRole(res.user.role)
        } else {
            const profile = await authAPI.getProfile()
            setUser(profile)
            redirectByRole(profile.role)
        }
    }

    function logout() {
        setUser(null)
        setToken(null)
        localStorage.removeItem("token")
        router.push("/")
    }

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    )
}
