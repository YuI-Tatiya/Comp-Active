import { Bai_Jamjuree, IBM_Plex_Sans_Thai, JetBrains_Mono } from "next/font/google"

// ฟอนต์ธีม Denim Varsity — โหลดเฉพาะใต้ layout ของผู้จัด (route อื่นไม่ต้องดาวน์โหลด)
// ผูกเป็นตัวแปร CSS ที่ --font-display / --font-plex / --font-code ใน globals.css อ้างถึง
//
// โหลดเท่าที่ใช้จริงเท่านั้น — ทุกไฟล์คือคำขอหนึ่งครั้งที่นับรวมใน burst ของ nginx (ดูเหตุผลใน app/layout.tsx):
// หัวข้อใช้ตัวหนา 700 อย่างเดียว (600 ที่ป้ายเดือนบนปกการ์ดจะใช้ 700 แทนตามกฎจับคู่น้ำหนักของ CSS),
// JetBrains Mono เป็น variable font ไม่ระบุน้ำหนักจึงได้ไฟล์เดียวครอบทุกน้ำหนัก
const baiJamjuree = Bai_Jamjuree({
    weight: "700",
    subsets: ["thai", "latin"],
    display: "swap",
    variable: "--font-bai-jamjuree",
})

const plexThai = IBM_Plex_Sans_Thai({
    weight: ["400", "500", "600"],
    subsets: ["thai", "latin"],
    display: "swap",
    variable: "--font-plex-thai",
})

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-jetbrains-mono",
})

export const denimFontVariables = `${baiJamjuree.variable} ${plexThai.variable} ${jetbrainsMono.variable}`
