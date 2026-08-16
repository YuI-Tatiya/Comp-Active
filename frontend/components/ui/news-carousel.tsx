"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Container } from "@/components/layout/container"
import { cn } from "@/lib/utils"

const NEWS_ITEMS = [
  {
    tag: "ประกาศ",
    title: "เปิดลงทะเบียนกิจกรรม AI Workshop รอบใหม่",
    desc: "นักศึกษาที่สนใจสามารถลงทะเบียนเข้าร่วมได้แล้ววันนี้ รับจำนวนจำกัด",
    date: "8 ส.ค. 2569",
    image: "/new1.png",
  },
  {
    tag: "ข่าวสาร",
    title: "ประกาศผลการประเมินซอฟต์สกิลประจำภาคเรียน",
    desc: "ตรวจสอบคะแนนสะสมทั้ง 12 ด้านของคุณได้แล้วที่หน้าโปรไฟล์",
    date: "5 ส.ค. 2569",
    image: "/new2.png",
  },
  {
    tag: "กิจกรรมเด่น",
    title: "Coding Challenge ชิงรางวัลรวมมูลค่ากว่า 10,000 บาท",
    desc: "ร่วมท้าทายทักษะการเขียนโปรแกรมกับเพื่อนๆ ทั่วทั้งวิทยาลัย",
    date: "1 ส.ค. 2569",
    image: "/new3.png",
  },
]

/**
 * สไลด์ข่าวสาร — เลื่อนเองทุก 6 วินาที กดปุ่มซ้าย/ขวา หรือจุดไข่ปลาได้
 * ใช้ทั้งหน้า / และ /student — แก้ข้อความหรือรูปที่นี่ที่เดียว เห็นผลทั้งสองหน้า
 *
 * แต่ละหน้าสร้าง instance ของตัวเอง สไลด์จึงเดินอิสระจากกัน (ตั้งใจให้เป็นแบบนี้)
 */
export function NewsCarousel() {
  const [newsIndex, setNewsIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setNewsIndex((i) => (i + 1) % NEWS_ITEMS.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="border-b border-border">
      <Container className="py-16 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-fg">ข่าวสารและประกาศ</h2>

        <div className="relative mx-auto mt-8 max-w-4xl">
          <div className="overflow-hidden rounded-xl border border-border bg-bg">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${newsIndex * 100}%)` }}
            >
              {NEWS_ITEMS.map((news, i) => (
                <div key={news.title} className="w-full shrink-0">
                  <Image
                    src={news.image}
                    alt={news.title}
                    width={1672}
                    height={941}
                    sizes="(min-width: 896px) 896px, 100vw"
                    className="h-auto w-full"
                    priority={i === 0}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ปุ่มเลื่อนซ้าย/ขวา */}
          <button
            type="button"
            onClick={() =>
              setNewsIndex((i) => (i - 1 + NEWS_ITEMS.length) % NEWS_ITEMS.length)
            }
            aria-label="ข่าวก่อนหน้า"
            className="absolute left-2 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-bg text-fg-muted shadow-xs transition-colors hover:text-fg sm:flex"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setNewsIndex((i) => (i + 1) % NEWS_ITEMS.length)}
            aria-label="ข่าวถัดไป"
            className="absolute right-2 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-bg text-fg-muted shadow-xs transition-colors hover:text-fg sm:flex"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>

          {/* จุดไข่ปลา — บอกตำแหน่งสไลด์ */}
          <div className="mt-5 flex items-center justify-center gap-2">
            {NEWS_ITEMS.map((news, i) => (
              <button
                key={news.title}
                type="button"
                onClick={() => setNewsIndex(i)}
                aria-label={`ไปที่ข่าว ${i + 1}`}
                aria-current={newsIndex === i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  newsIndex === i ? "w-6 bg-brand-600" : "w-1.5 bg-border-strong"
                )}
              />
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
