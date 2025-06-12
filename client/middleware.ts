import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  console.log('[MIDDLEWARE] Processing:', pathname);
  
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
    // NEW: Check for authentication tokens in cookies/headers
    const authToken = request.cookies.get('CognitoIdentityServiceProvider.idToken');
    const sessionToken = request.cookies.get('amplify-signin-with-hostedUI');
    
    // If user appears to be authenticated, let them through
    if (authToken || sessionToken) {
      console.log('[MIDDLEWARE] User appears authenticated, allowing access to:', pathname);
      return NextResponse.next();
    }
    
    // Only redirect if no auth tokens found
    const authCheckUrl = new URL('/auth-check', request.url);
    authCheckUrl.searchParams.set('redirect', pathname);
    
    console.log('[MIDDLEWARE] No auth found, redirecting:', pathname, '-> auth-check');
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