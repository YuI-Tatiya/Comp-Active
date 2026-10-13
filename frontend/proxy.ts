import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_HOSTS, hostnameOf } from './lib/admin-host';

const ADMIN_PREFIX = '/admin';

// ที่อยู่ภายในของตัว server เอง — คำขอจากผู้ใช้จริงจะไม่มีทางมาด้วย Host พวกนี้
// เพราะ nginx ส่ง `Host $host` (app.localhost / admin.localhost) มาให้เสมอ
// และ container frontend ก็ไม่ได้ publish port ออกนอก (ดู docker-compose.yml)
const INTERNAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', 'frontend']);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ตัดสินจาก Host header เป็นหลัก — ห้ามเชื่อ x-forwarded-host ที่ client ส่งมา
  // (ทดสอบแล้วว่า Next ปล่อยค่าที่ client ปลอมผ่านเข้ามาตรง ๆ ไม่ได้เขียนทับให้)
  // ไม่งั้นจะยิง `curl -H "X-Forwarded-Host: admin.localhost" http://app.localhost/`
  // เข้าโซนแอดมินได้จาก origin ของนักศึกษา
  const hostname = hostnameOf(request.headers.get('host'));
  let isAdminHost = ADMIN_HOSTS.includes(hostname);

  // ข้อยกเว้นเดียว: หลัง rewrite ด้านล่าง Next จะเรียก proxy ซ้ำอีกรอบด้วย
  // Host = ที่อยู่ภายในของ server (เช่น localhost:3000) เหลือ x-forwarded-host
  // ตัวเดียวที่ยังจำโดเมนเดิมได้ รอบนั้นจึงต้องยอมอ่าน xfh ไม่งั้น /admin จะเด้งกลับ /
  // เป็นลูป 307 — และเพราะเช็ค INTERNAL_HOSTS ไว้ก่อน คำขอจากภายนอกจึงเข้าทางนี้ไม่ได้
  if (!isAdminHost && INTERNAL_HOSTS.has(hostname)) {
    isAdminHost = ADMIN_HOSTS.includes(hostnameOf(request.headers.get('x-forwarded-host')));
  }

  if (isAdminHost) {
    if (pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)) {
      // Already physically under /admin (the internal hop after our own rewrite,
      // or a clean link) — let it through without double-prefixing.
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = pathname === '/' ? ADMIN_PREFIX : `${ADMIN_PREFIX}${pathname}`;
    return NextResponse.rewrite(url);
  }

  if (pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)) {
    // The admin zone only exists on the admin subdomain — unreachable from here.
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
