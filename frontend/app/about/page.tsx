"use client"

import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { TechMotionBackground } from "@/components/ui/tech-motion-background"

export default function AboutPage() {
    return (
        <div className="flex min-h-screen flex-col bg-surface font-sans">
            <SiteHeader />
            <main className="relative min-h-[480px] flex-1 overflow-hidden">
                <TechMotionBackground />
            </main>
            <SiteFooter />
        </div>
    )
}
