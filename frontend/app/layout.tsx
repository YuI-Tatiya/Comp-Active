import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { BottomSlotProvider } from "@/components/layout/bottom-nav";
import { MascotWidget } from "@/components/ui/mascot-widget";
import { denimFontVariables } from "@/lib/denim-fonts";

export const metadata: Metadata = {
  title: "Comp Active — ระบบจัดการกิจกรรม",
  description: "ระบบจัดการกิจกรรมนอกหลักสูตร วิทยาลัยการคอมพิวเตอร์",
};

// viewportFit: "cover" — ให้ browser ส่งค่า env(safe-area-inset-*) จริงบน iPhone ที่มี home indicator/noth
// (ไม่ใส่ค่านี้ env() จะเป็น 0 เสมอ) จำเป็นสำหรับแถบเมนูล่างมือถือ (BottomNav) ที่ fix ติดขอบล่างจอ
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // ตัวแปรฟอนต์ (lib/denim-fonts.ts) ต้องอยู่บน <html> ไม่ใช่ <body> — utility ฟอนต์ใน globals.css อ้างถึง
    // ตัวแปรเหล่านี้ และ element ที่ใช้งานต้องมองเห็นตัวแปรจากบรรพบุรุษ (เคยอยู่บน body แล้ว --font-sans ที่ประกาศ
    // ไว้บน :root หาไม่เจอ ฟอนต์ตกไปใช้ system-ui ของ OS แทน — บั๊กเดิมของโปรเจกต์)
    //
    // ไม่เช็ค "โซนแอดมินไหม" ตรงนี้ด้วย headers() แม้จะเป็นจุดที่ "ถูกต้อง" ที่สุดในทางทฤษฎี (อ่าน Host
    // ฝั่ง server แหล่งเดียวกับ proxy.ts) เพราะมันบังคับให้ RootLayout กลายเป็น dynamic ไปด้วย — เคยลองแล้ว
    // ทุกหน้าที่เคย prerender เป็น static (○) ตอน build เปลี่ยนเป็น server-render ทุกคำขอ (ƒ) หมดทั้งแอป
    // ย้ายเช็คไปไว้ใน MascotWidget เองแทน (client-side, อ่าน window.location.hostname) ดูเหตุผลที่นั่น
    <html lang="th" className={denimFontVariables}>
      <body className="font-sans antialiased">
        <AuthProvider>
          {/* BottomSlotProvider ให้ MobileActionBar (หน้ารายละเอียดกิจกรรมของนักศึกษา) กับ BottomNav
              (แถบเมนูล่างของ student/organizer layout) ผลัดกันใช้พื้นที่ล่างจอ ไม่ชนกัน — ดูเหตุผลที่
              components/layout/bottom-nav.tsx ครอบทั้งแอปตรงนี้ที่เดียว เหมือน MascotWidget ด้านล่าง */}
          <BottomSlotProvider>
            {children}
            <div className="print:hidden">
              <MascotWidget />
            </div>
          </BottomSlotProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
