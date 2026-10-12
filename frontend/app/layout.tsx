import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { MascotWidget } from "@/components/ui/mascot-widget";
import { denimFontVariables } from "@/lib/denim-fonts";

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
<<<<<<< HEAD
    // --font-sarabun ต้องอยู่บน <html> ไม่ใช่ <body> เพราะ @theme ของ Tailwind ประกาศ
    // --font-sans: var(--font-sarabun) ไว้บน :root — ถ้าตัวแปรอยู่บน body ตัว :root จะหาไม่เจอ
    // ทำให้ --font-sans เป็น invalid แล้วตกไปใช้ system-ui ของ OS แทน (บั๊กเดิมของโปรเจกต์)
    <html lang="th" className={sarabun.variable}>
=======
    // ตัวแปรฟอนต์ (lib/denim-fonts.ts) ต้องอยู่บน <html> ไม่ใช่ <body> — utility ฟอนต์ใน globals.css อ้างถึง
    // ตัวแปรเหล่านี้ และ element ที่ใช้งานต้องมองเห็นตัวแปรจากบรรพบุรุษ (เคยอยู่บน body แล้ว --font-sans ที่ประกาศ
    // ไว้บน :root หาไม่เจอ ฟอนต์ตกไปใช้ system-ui ของ OS แทน — บั๊กเดิมของโปรเจกต์)
    //
    // ไม่เช็ค "โซนแอดมินไหม" ตรงนี้ด้วย headers() แม้จะเป็นจุดที่ "ถูกต้อง" ที่สุดในทางทฤษฎี (อ่าน Host
    // ฝั่ง server แหล่งเดียวกับ proxy.ts) เพราะมันบังคับให้ RootLayout กลายเป็น dynamic ไปด้วย — เคยลองแล้ว
    // ทุกหน้าที่เคย prerender เป็น static (○) ตอน build เปลี่ยนเป็น server-render ทุกคำขอ (ƒ) หมดทั้งแอป
    // ย้ายเช็คไปไว้ใน MascotWidget เองแทน (client-side, อ่าน window.location.hostname) ดูเหตุผลที่นั่น
    <html lang="th" className={denimFontVariables}>
>>>>>>> organize
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
