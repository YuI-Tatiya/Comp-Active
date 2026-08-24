import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { MascotWidget } from "@/components/ui/mascot-widget";

// รองรับทั้งไทย+ละตินในตัวเดียว — self-host ผ่าน next/font ทำให้ทุกเครื่อง
// (Windows/macOS) เห็นฟอนต์เดียวกันเสมอ ไม่พึ่งฟอนต์ที่ติดตั้งในเครื่องผู้ใช้
const sarabun = Sarabun({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  subsets: ["thai", "latin"],
  display: "swap",
  variable: "--font-sarabun",
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
    <html lang="th" className={sarabun.variable}>
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
          <MascotWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
