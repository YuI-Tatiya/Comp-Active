import { Bai_Jamjuree, IBM_Plex_Sans_Thai, JetBrains_Mono } from "next/font/google"

// ฟอนต์ทั้งระบบ (ธีม Denim Varsity) — ผูกตัวแปรไว้บน <html> ใน app/layout.tsx
// --font-sans / --font-heading / --font-display / --font-plex / --font-code ใน globals.css อ้างถึงตัวแปรเหล่านี้
//
// Plex (เนื้อหา) กับ Bai Jamjuree (หัวข้อ) ใช้ทุกหน้า จึง preload — ไม่งั้นทุกหน้ากระพริบจากฟอนต์ระบบไปฟอนต์จริง
// JetBrains Mono ใช้เฉพาะป้ายแบบโค้ดของธีม จึงไม่ preload (โหลดเฉพาะหน้าที่มีตัวอักษรใช้ฟอนต์นี้จริง)
// รวมแล้ว 10 ไฟล์ (Plex 4 น้ำหนัก × ไทย/ละติน + Bai 2) — เทียบกับ Sarabun เดิมที่ preload 32 ไฟล์ทุกหน้าจนกินโควตา
// burst ของ nginx (ดู CLAUDE.md "Request budget") อย่าเพิ่มน้ำหนักเกินที่ใช้จริง
//
// Bai Jamjuree โหลดแค่ 700: หัวข้อทั้งระบบเป็นตัวหนา (h1-h6 ขนาด/น้ำหนักอื่นจะจับคู่มาที่ 700 ตามกฎ CSS)
// JetBrains Mono เป็น variable font ไม่ระบุน้ำหนักจึงได้ไฟล์เดียวครอบทุกน้ำหนัก
const baiJamjuree = Bai_Jamjuree({
    weight: "700",
    subsets: ["thai", "latin"],
    display: "swap",
    variable: "--font-bai-jamjuree",
})

const plexThai = IBM_Plex_Sans_Thai({
    weight: ["400", "500", "600", "700"],
    subsets: ["thai", "latin"],
    display: "swap",
    variable: "--font-plex-thai",
})

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    display: "swap",
    preload: false,
    variable: "--font-jetbrains-mono",
})

export const denimFontVariables = `${baiJamjuree.variable} ${plexThai.variable} ${jetbrainsMono.variable}`
