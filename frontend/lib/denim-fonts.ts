import { Bai_Jamjuree, IBM_Plex_Sans_Thai, JetBrains_Mono } from "next/font/google"

// ฟอนต์ธีม Denim Varsity (พอร์ทัลผู้จัด + หน้าฝั่ง public) — ผูกตัวแปรไว้บน <html> ใน app/layout.tsx
// ให้ --font-display / --font-plex / --font-code ใน globals.css อ้างถึงได้ทุกหน้า
//
// preload: false ทั้งหมด — ประกาศไว้ทุก route แต่เบราว์เซอร์จะโหลดไฟล์ก็ต่อเมื่อหน้านั้นมีตัวอักษรที่ใช้ฟอนต์นี้จริง
// (หน้านักศึกษาที่ยังไม่ใช้ธีมนี้จึงไม่ต้องดาวน์โหลดอะไรเพิ่ม) ถ้า preload ที่ root จะบังคับโหลดทุกหน้า
// แล้วกินโควตา burst ของ nginx เหมือนที่ Sarabun เคยทำ (ดูเหตุผลใน app/layout.tsx)
//
// โหลดเท่าที่ใช้จริงเท่านั้น: หัวข้อใช้ตัวหนา 700 อย่างเดียว (600 ที่ป้ายเดือนบนปกการ์ดจะใช้ 700 แทน
// ตามกฎจับคู่น้ำหนักของ CSS), JetBrains Mono เป็น variable font ไม่ระบุน้ำหนักจึงได้ไฟล์เดียวครอบทุกน้ำหนัก
const baiJamjuree = Bai_Jamjuree({
    weight: "700",
    subsets: ["thai", "latin"],
    display: "swap",
    preload: false,
    variable: "--font-bai-jamjuree",
})

const plexThai = IBM_Plex_Sans_Thai({
    weight: ["400", "500", "600"],
    subsets: ["thai", "latin"],
    display: "swap",
    preload: false,
    variable: "--font-plex-thai",
})

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    display: "swap",
    preload: false,
    variable: "--font-jetbrains-mono",
})

export const denimFontVariables = `${baiJamjuree.variable} ${plexThai.variable} ${jetbrainsMono.variable}`
