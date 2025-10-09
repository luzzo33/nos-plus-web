import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { locales } from './i18n.config';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

function isMaintEnabled() {
  const raw = (process.env.MAINTENANCE || process.env.NEXT_PUBLIC_MAINTENANCE || '')
    .toString()
    .toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}
function isMaintenancePath(pathname: string): boolean {
  if (pathname === '/maintenance' || pathname.startsWith('/maintenance/')) return true;
  return locales.some(
    (locale) =>
      pathname === `/${locale}/maintenance` || pathname.startsWith(`/${locale}/maintenance/`),
  );
}

export default function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;

  if (pathname.startsWith('/auth') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  if (pathname === '/maintenance-unlock' && req.method === 'POST') {
    const rewriteUrl = nextUrl.clone();
    rewriteUrl.pathname = '/api/maintenance-unlock';
    return NextResponse.rewrite(rewriteUrl);
  }

  if (isMaintEnabled()) {
    const maintBypass =
      isMaintenancePath(pathname) ||
      pathname.startsWith('/api/maintenance') ||
      pathname.startsWith('/api/maintenance-unlock');
    if (!maintBypass) {
      const value = cookies.get('m_access')?.value ?? '';
      const decoded = typeof value === 'string' ? decodeURIComponent(value) : '';
      const valid = decoded.startsWith('v1:');
      if (!valid) {
        const redirectUrl = nextUrl.clone();
        redirectUrl.pathname = '/maintenance';
        redirectUrl.searchParams.set('next', `${pathname}${nextUrl.search || ''}`);
        return NextResponse.redirect(redirectUrl);
      }
    }
    if (maintBypass) {
      return NextResponse.next();
    }
  }

  return (intlMiddleware as any)(req);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
