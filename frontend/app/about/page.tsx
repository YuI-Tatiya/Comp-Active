"use client"

import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { AboutSections } from "@/components/about/about-sections"

export default function AboutPage() {
    return (
        <div className="flex min-h-screen flex-col bg-bg font-sans">
            <SiteHeader />
            <main className="flex-1">
                <AboutSections />
            </main>
            <SiteFooter theme="denim" />
        </div>
    )
}
