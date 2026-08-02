import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const kanit = Kanit({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  subsets: ["latin", "thai"],
  variable: "--font-kanit",
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
    <html lang="th">
      <body className={`${kanit.variable} font-sans kanit-regular antialiased text-slate-800`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
