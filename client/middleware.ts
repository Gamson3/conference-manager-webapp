import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Don't intercept API routes, static files, or auth-check page itself
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/auth-check' ||
    pathname.includes('.') // files with extensions
  ) {
    return NextResponse.next();
  }
  
  // Check if this is a dashboard route that needs protection
  const isDashboardRoute = pathname.startsWith('/organizer') || pathname.startsWith('/attendee');
  
  if (isDashboardRoute) {
    // Redirect to auth-check with the original path
    const authCheckUrl = new URL('/auth-check', request.url);
    authCheckUrl.searchParams.set('redirect', pathname);
    
    console.log('[MIDDLEWARE] Intercepting dashboard route:', pathname, '-> auth-check');
    return NextResponse.redirect(authCheckUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth-check (our auth check page)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|auth-check).*)',
  ],
};