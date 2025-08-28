"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useAuth } from './authContext';
import { fetchAuthSession } from 'aws-amplify/auth';

// Configure Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID!,
    },
  },
});

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, refreshUser } = useAuth();
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);
  const router = useRouter();
  const pathname = usePathname();
  const authCheckCompleteRef = useRef(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Page classification
  const isAuthPage = pathname.match(/^\/(signin|signup)$/);
  const isDashboardPage = pathname.startsWith('/organizer') || 
                          pathname.startsWith('/attendee') || 
                          pathname.startsWith('/presenter');

  // Better route protection with session check
  useEffect(() => {
    // Skip if already redirecting or checking
    if (isRedirecting || authCheckCompleteRef.current) return;

    const checkAuth = async () => {
      // Skip if we're still loading
      if (isLoading) return;
      
      authCheckCompleteRef.current = true;
      
      try {
        // Double-check session from Amplify
        const session = await fetchAuthSession();
        const hasValidSession = !!session.tokens?.idToken;
        
        console.log("[AUTH] Session check:", {
          hasUser: !!user,
          hasValidSession,
          isAuthPage,
          isDashboardPage,
          path: pathname
        });
        
        // Case 1: Auth pages when already logged in
        if (isAuthPage && (hasValidSession || !!user)) {
          setIsRedirecting(true);
          const dashboardPath = `/${user?.roles[0] || 'attendee'}/dashboard`;
          console.log(`[AUTH] Redirecting authenticated user from auth page to: ${dashboardPath}`);
          router.replace(dashboardPath);
          return;
        }
        
        // Case 2: Dashboard pages when not logged in
        if (isDashboardPage && !hasValidSession && !user) {
          setIsRedirecting(true);
          console.log('[AUTH] Redirecting unauthenticated user from dashboard to signin');
          router.replace('/signin');
          return;
        }
      } catch (error) {
        console.error("[AUTH] Error checking auth state:", error);
      } finally {
        // Reset state after a delay
        setTimeout(() => {
          authCheckCompleteRef.current = false;
          setIsRedirecting(false);
        }, 500);
      }
    };
    
    checkAuth();
  }, [user, isLoading, isAuthPage, isDashboardPage, router, pathname]);

  // Just render children
  return <>{children}</>;
};

export default AuthProvider;