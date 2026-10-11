import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { MascotWidget } from "@/components/ui/mascot-widget";
import { denimFontVariables } from "@/lib/denim-fonts";

// รองรับทั้งไทย+ละตินในตัวเดียว — self-host ผ่าน next/font ทำให้ทุกเครื่อง
// (Windows/macOS) เห็นฟอนต์เดียวกันเสมอ ไม่พึ่งฟอนต์ที่ติดตั้งในเครื่องผู้ใช้
const sarabun = Sarabun({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  subsets: ["thai", "latin"],
  display: "swap",
  variable: "--font-sarabun",
  // ไม่ preload: 8 น้ำหนัก × ปกติ/เอียง × ไทย/ละติน = 32 ไฟล์ถูกบังคับโหลดทุกหน้า ทั้งที่หน้าหนึ่งใช้จริงไม่กี่ตัว
  // แค่ฟอนต์อย่างเดียวก็กินโควตา burst 60 คำขอของ nginx (zone general) ไปครึ่งหนึ่ง — โหลดหน้าแบบไม่มีแคช
  // (เปิดครั้งแรก/กด hard refresh) จึงโดน 429 ที่คำขอ API ท้ายแถว แล้วหน้ากลายเป็นรายการว่าง
  // (วัดจริงที่ /organizer: 72 คำขอใน 1 วินาที เป็นฟอนต์ 45) ปิด preload แล้วเบราว์เซอร์โหลดเฉพาะตัวที่หน้านั้นใช้
  preload: false,
});

export const metadata: Metadata = {
  title: "Comp Active — ระบบจัดการกิจกรรม",
  description: "ระบบจัดการกิจกรรมนอกหลักสูตร วิทยาลัยการคอมพิวเตอร์",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // --font-sarabun ต้องอยู่บน <html> ไม่ใช่ <body> เพราะ @theme ของ Tailwind ประกาศ
    // --font-sans: var(--font-sarabun) ไว้บน :root — ถ้าตัวแปรอยู่บน body ตัว :root จะหาไม่เจอ
    // ทำให้ --font-sans เป็น invalid แล้วตกไปใช้ system-ui ของ OS แทน (บั๊กเดิมของโปรเจกต์)
    //
    // ไม่เช็ค "โซนแอดมินไหม" ตรงนี้ด้วย headers() แม้จะเป็นจุดที่ "ถูกต้อง" ที่สุดในทางทฤษฎี (อ่าน Host
    // ฝั่ง server แหล่งเดียวกับ proxy.ts) เพราะมันบังคับให้ RootLayout กลายเป็น dynamic ไปด้วย — เคยลองแล้ว
    // ทุกหน้าที่เคย prerender เป็น static (○) ตอน build เปลี่ยนเป็น server-render ทุกคำขอ (ƒ) หมดทั้งแอป
    // ย้ายเช็คไปไว้ใน MascotWidget เองแทน (client-side, อ่าน window.location.hostname) ดูเหตุผลที่นั่น
    // ตัวแปรฟอนต์ธีม Denim อยู่บน <html> ด้วยเหตุผลเดียวกัน — ไม่ preload (ดู lib/denim-fonts.ts)
    <html lang="th" className={`${sarabun.variable} ${denimFontVariables}`}>
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
          <div className="print:hidden">
            <MascotWidget />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
