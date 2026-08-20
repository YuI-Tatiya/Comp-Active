"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import type { User } from "@/lib/api"

interface RoleGuardProps {
    allow: User["role"][]
    children: React.ReactNode
}

// กัน role อื่นหลุดเข้าหน้าที่ไม่ใช่ของตัวเอง (เช่น student เข้า /organizer/create)
// แล้วไปเจอ 403 ตอน submit แทนที่จะถูกเด้งออกตั้งแต่แรก
export function RoleGuard({ allow, children }: RoleGuardProps) {
    const { user, isLoading } = useAuth()
    const router = useRouter()

    const authorized = !isLoading && !!user && allow.includes(user.role)

    useEffect(() => {
        if (isLoading) return
        if (!user) {
            router.replace("/auth")
            return
        }
        if (!allow.includes(user.role)) {
            router.replace(`/${user.role}`)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, user])

    if (!authorized) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="size-6 animate-spin text-brand-600" />
            </div>
        )
    }

    return <>{children}</>
}
