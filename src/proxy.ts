import { NextRequest, NextResponse } from 'next/server';

// Pages only the superadmin can access
const SA_ONLY = ['/admin/global-metrics', '/admin/onboarding'];

// Pages regular staff/admin can access (superadmin must NOT land here)
const CLINIC_ONLY = ['/admin/inbox', '/admin/appointments', '/admin/metrics', '/admin/knowledge', '/admin/users'];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always pass login page + all auth APIs
  if (pathname === '/admin/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const token = req.cookies.get('sb-token')?.value;

  // Not logged in → redirect to login (or 401 for API calls)
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/admin/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = req.cookies.get('sb-role')?.value; // 'superadmin' | 'admin' | 'staff'

  // ── Superadmin trying to access clinic pages ──────────────────
  if (role === 'superadmin' && CLINIC_ONLY.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/admin/global-metrics', req.url));
  }

  // ── Regular user trying to access superadmin pages ────────────
  if (role !== 'superadmin' && SA_ONLY.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/admin/inbox', req.url));
  }

  // ── /admin root redirect by role ─────────────────────────────
  if (pathname === '/admin' || pathname === '/admin/') {
    if (role === 'superadmin') {
      return NextResponse.redirect(new URL('/admin/global-metrics', req.url));
    }
    return NextResponse.redirect(new URL('/admin/inbox', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
