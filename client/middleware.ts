import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  console.log('[MIDDLEWARE] Processing:', pathname);
  
  // Don't intercept API routes, static files, or auth pages
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.match(/^\/(signin|signup|auth-check)$/) ||
    pathname.includes('.') // files with extensions
  ) {
    return NextResponse.next();
  }
  
  // Check if this is a dashboard route that needs protection
  const isDashboardRoute = pathname.startsWith('/organizer') || pathname.startsWith('/attendee');
  
  if (isDashboardRoute) {
    // Check for authentication tokens in cookies
    const authToken = request.cookies.get('CognitoIdentityServiceProvider.idToken');
    const sessionToken = request.cookies.get('amplify-signin-with-hostedUI');
    
    // If user appears to be authenticated, let them through
    if (authToken || sessionToken) {
      console.log('[MIDDLEWARE] User appears authenticated, allowing access to:', pathname);
      return NextResponse.next();
    }
    
    // ✅ FIXED: Redirect directly to signin instead of auth-check
    console.log('[MIDDLEWARE] No auth found, redirecting to signin');
    return NextResponse.redirect(new URL('/signin', request.url));
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
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public/).*)',
  ],
};