import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// nginx/default.conf ยังไม่มี TLS (มี TODO ค้างอยู่) — ถ้าเปิด upgrade-insecure-requests
// หรือ HSTS ตอนนี้ browser จะอัป http://api.localhost เป็น https:// แล้วยิงไม่ติดทั้งระบบ
// พอวาง cert เสร็จเมื่อไร ตั้ง ENABLE_HTTPS=true ตอน build เพื่อเปิดสองอันนี้
const httpsEnabled = process.env.ENABLE_HTTPS === "true";

// Origin ของ backend — ต้องตรงกับ NEXT_PUBLIC_API_URL ที่ใช้ตอน build (ตีความแบบเดียวกับ lib/api-base.ts)
// Docker ส่งมาเป็น "same-origin" = API อยู่โดเมนเดียวกับหน้าเว็บ (nginx ส่ง /api, /uploads ต่อให้ backend)
// จึงพอแค่ 'self' ไม่ต้องเพิ่ม origin อื่น; ส่วน `npm run dev` เปล่า ๆ ใช้ค่า default localhost:3001
const apiOrigin = (() => {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
  if (raw === "same-origin") return "";
  try {
    return new URL(raw || "http://localhost:3001").origin;
  } catch {
    return "http://localhost:3001";
  }
})();

// รูป fallback ใน components/ui/event-card.tsx ยังชี้ไป Unsplash อยู่ ถ้าเลิกใช้เมื่อไร ลบออกจาก img-src ได้เลย
const externalImgHosts = ["https://images.unsplash.com"];

// โดเมนสาธารณะของ R2/CDN เมื่อ backend ตั้งค่า storage ไว้ (ดู backend/src/config/storage.config.ts) —
// ไฟล์อัปโหลด (รูปกิจกรรม) จะเป็น URL เต็มของโดเมนนี้แทน path สัมพัทธ์ /uploads/... เดิม
// ต้องเป็น build-time env เหมือน NEXT_PUBLIC_API_URL เพราะ CSP header ถูกคำนวณตอน build
const uploadsOrigin = (() => {
  const raw = (process.env.NEXT_PUBLIC_UPLOADS_ORIGIN ?? "").trim();
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
})();
if (uploadsOrigin) externalImgHosts.push(uploadsOrigin);

// Origin จริงของ backend เมื่อมันไม่ได้อยู่หลัง nginx เดียวกับหน้าเว็บอีกต่อไป (เช่น Vercel + Railway —
// ดู DEPLOYMENT.md) ตั้งคู่กับ NEXT_PUBLIC_API_URL=same-origin เสมอ: ฝั่ง browser ยังเรียก path สัมพัทธ์
// ของตัวเองเหมือนเดิมทุกประการ (cookie ยังเป็น first-party) แต่ Vercel edge เป็นคน proxy ไปหา backend
// จริงแทน nginx — ไม่ใช่ NEXT_PUBLIC_* เพราะใช้แค่ตอน build คำนวณ rewrites() ไม่ต้องส่งลง client bundle
const backendOrigin = (() => {
  const raw = (process.env.BACKEND_ORIGIN ?? "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
})();

const csp = [
  `default-src 'self'`,
  // Next ฝัง bootstrap script แบบ inline จึงต้องมี 'unsafe-inline'; 'unsafe-eval' จำเป็นเฉพาะ HMR ตอน dev
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  ["img-src 'self' data: blob:", apiOrigin, ...externalImgHosts].filter(Boolean).join(" "),
  `media-src 'self' blob:`,
  `font-src 'self' data:`,
  ["connect-src 'self'", apiOrigin, ...(isDev ? ["ws:", "wss:"] : [])].filter(Boolean).join(" "),
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  ...(httpsEnabled ? [`upgrade-insecure-requests`] : []),
].join("; ");

const nextConfig: NextConfig = {
  // "standalone" รวม server.js + node_modules ที่ตัดแล้วไว้ใน .next/standalone/ สำหรับ
  // frontend/Dockerfile (self-host, docker-compose) เท่านั้น — Vercel มีระบบ bundle serverless
  // function ของตัวเอง (อาศัย .next/server/*.nft.json) ถ้าเปิด standalone ไว้ด้วย Vercel's
  // build step (onBuildComplete) จะหาไฟล์ .nft.json ไม่เจอแล้ว build fail ทันที
  // (ENOENT .next/next-server.js.nft.json) — ตรวจจาก process.env.VERCEL ที่ Vercel ตั้งให้เองเสมอ
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),

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

  async rewrites() {
    if (!backendOrigin) return [];
    return [
      // Developer API สาธารณะ (api.*) สงวนไว้เฉพาะโฮสต์นั้น — app./admin. ต้องไม่ proxy ต่อให้ backend
      // เด็ดขาด เหมือนที่ nginx/default.conf สั่ง return 404 เส้นทางนี้บนสอง server block นั้น
      // รีไรต์ "กลับไปที่ตัวเอง" ให้ Next หยุดตรงนี้ ไม่ไหลลงไปโดนกฎทั่วไปข้างล่าง แล้วได้ 404 ปกติของ Next
      // เอง (ไม่มีหน้า /api/v1 จริงในแอป) — ผลลัพธ์เดียวกับที่ nginx ทำ
      { source: "/api/v1/:path*", destination: "/api/v1/:path*" },
      // same-origin ตามที่ NEXT_PUBLIC_API_URL=same-origin ตั้งใจไว้ — browser ยังเห็นแค่ path สัมพัทธ์
      // ของโฮสต์ตัวเอง (cookie เป็น first-party เหมือนเดิม) ส่วนนี้คือสิ่งที่ nginx เคยทำแทน
      { source: "/api/:path*", destination: `${backendOrigin}/api/:path*` },
      // เผื่อ backend ยังไม่ได้ตั้งค่า R2 (ดู storage.config.ts) — ไฟล์อัปโหลดยังเป็น path สัมพัทธ์
      // /uploads/... ที่ต้อง proxy เหมือน /api/ ด้านบน ถ้าใช้ R2 แล้วค่านี้ไม่ถูกเรียกเลย เพราะ
      // resolveUploadUrl() คืน URL เต็มของ R2 ตรงๆ ไม่ผ่าน path นี้
      { source: "/uploads/:path*", destination: `${backendOrigin}/uploads/:path*` },
    ];
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
