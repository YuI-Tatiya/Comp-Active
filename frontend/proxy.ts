import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PREFIX = '/admin';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // nextUrl.hostname gets normalized by Next.js in dev mode — the raw Host header
  // (or x-forwarded-host behind a proxy) is what actually reflects the requested subdomain.
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const hostname = host.split(':')[0];
  const isAdminHost = hostname.startsWith('admin.');

  if (isAdminHost) {
    if (pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)) {
      // Already physically under /admin (shouldn't normally happen from a clean link,
      // but avoids double-prefixing if it does).
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
