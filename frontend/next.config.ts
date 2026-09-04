import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// nginx/default.conf ยังไม่มี TLS (มี TODO ค้างอยู่) — ถ้าเปิด upgrade-insecure-requests
// หรือ HSTS ตอนนี้ browser จะอัป http://api.localhost เป็น https:// แล้วยิงไม่ติดทั้งระบบ
// พอวาง cert เสร็จเมื่อไร ตั้ง ENABLE_HTTPS=true ตอน build เพื่อเปิดสองอันนี้
const httpsEnabled = process.env.ENABLE_HTTPS === "true";

// Origin ของ backend — ต้องตรงกับ NEXT_PUBLIC_API_URL ที่ใช้ตอน build
// (Docker ส่งมาเป็น build ARG = http://api.localhost, ส่วน `npm run dev` เปล่า ๆ ใช้ค่า default)
const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").origin;
  } catch {
    return "http://localhost:3001";
  }
})();

// รูป fallback ใน components/ui/event-card.tsx ยังชี้ไป Unsplash อยู่ ถ้าเลิกใช้เมื่อไร ลบออกจาก img-src ได้เลย
const externalImgHosts = ["https://images.unsplash.com"];

const csp = [
  `default-src 'self'`,
  // Next ฝัง bootstrap script แบบ inline จึงต้องมี 'unsafe-inline'; 'unsafe-eval' จำเป็นเฉพาะ HMR ตอน dev
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${apiOrigin} ${externalImgHosts.join(" ")}`,
  `media-src 'self' blob:`,
  `font-src 'self' data:`,
  `connect-src 'self' ${apiOrigin}${isDev ? " ws: wss:" : ""}`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  ...(httpsEnabled ? [`upgrade-insecure-requests`] : []),
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",

  // ไม่ประกาศเวอร์ชัน Next ให้ผู้โจมตีรู้ผ่าน header
  poweredByHeader: false,

  images: {
    // ห้าม AVIF — กัน GHSA-2xp9-vwfh-vxw4 (RCE ใน libheif ที่ sharp เรียกใช้) ไว้อีกชั้น
    // ถึงจะอัปเป็น 16.3.4 ที่ปิด AVIF ให้แล้วก็ตาม
    formats: ["image/webp"],

    // ระบุให้ชัด: ห้าม optimize SVG (กัน XSS/DoS ผ่าน SVG ที่ผู้ใช้อัปโหลด)
    dangerouslyAllowSVG: false,

    minimumCacheTTL: 3600,

    // จำกัดเฉพาะ origin ของ backend ตัวเอง และเฉพาะ path อัปโหลด
    // (Unsplash / pravatar ถูกถอดออก — ไม่มี <Image> ตัวไหนใช้ และการเปิดโฮสต์ภายนอก
    //  ทำให้ /_next/image กลายเป็น proxy ดึงรูปจากเน็ตมา decode ให้ผู้โจมตีได้)
    remotePatterns: [
      { protocol: "http", hostname: "api.localhost", pathname: "/uploads/**" },
      { protocol: "http", hostname: "localhost", port: "3001", pathname: "/uploads/**" },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), interest-cohort=()" },
          // camera ไม่ได้ปิด เพราะหน้าเช็คชื่อสแกน QR (jsqr) ต้องใช้กล้อง
          ...(httpsEnabled
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
