"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Amplify } from 'aws-amplify';
import { Authenticator, Heading, Radio, RadioGroupField, useAuthenticator, View } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { usePathname, useRouter } from 'next/navigation';
import { fetchUserAttributes } from 'aws-amplify/auth';

// Configure Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID!,
    },
  },
});

const components = {
  Header() {
    return (
      <View className="mt-4 mb-7">
        <Heading level={3} className="!text-2xl !font-bold">
          CONFERENCE<span className="text-secondary-500 font-bold hover:!text-primary-300">MASTER</span>
        </Heading>
        <p className="text-muted-foreground mt-2">
          Welcome! <span className="font-bold">Please sign in to continue</span>
        </p>
      </View>
    );
  },
  SignIn: {
    Footer() {
      const { toSignUp } = useAuthenticator();
      return (
        <View className="text-center mt-4">
          <p className="text-muted-foreground">
            Don&apos;t have an account?{' '}
            <button onClick={toSignUp} className="text-primary hover:underline bg-transparent border-none p-0">
              Sign up here
            </button>
          </p>
        </View>
      );
    },
  },
  SignUp: {
    FormFields() {
      const { validationErrors } = useAuthenticator();
      return (
        <>
          <Authenticator.SignUp.FormFields />
          <RadioGroupField
            legend="Role"
            name="custom:role"
            errorMessage={validationErrors?.['custom:role']}
            hasError={!!validationErrors?.['custom:role']}
            isRequired
          >
            <Radio value="organizer">Organizer</Radio>
            <Radio value="attendee">Attendee</Radio>
          </RadioGroupField>
        </>
      );
    },
    Footer() {
      const { toSignIn } = useAuthenticator();
      return (
        <View className="text-center mt-4">
          <p className="text-muted-foreground">
            Already have an account?{' '}
            <button onClick={toSignIn} className="text-primary hover:underline bg-transparent border-none p-0">
              Sign in
            </button>
          </p>
        </View>
      );
    },
  },
};

const formFields = {
  signIn: {
    username: {
      placeholder: 'Enter your email',
      label: 'Email',
      isRequired: true,
    },
    password: {
      placeholder: 'Enter your password',
      label: 'Password',
      isRequired: true,
    },
  },
  signUp: {
    username: {
      order: 1,
      placeholder: 'Choose a username',
      label: 'Username',
      isRequired: true,
    },
    email: {
      order: 2,
      placeholder: 'Enter your email address',
      label: 'Email',
      isRequired: true,
    },
    password: {
      order: 3,
      placeholder: 'Create a password',
      label: 'Password',
      isRequired: true,
    },
    confirm_password: {
      order: 4,
      placeholder: 'Confirm your password',
      label: 'Confirm Password',
      isRequired: true,
    },
  },
};


const Auth = ({ children }: { children: React.ReactNode }) => {
  const { user, authStatus } = useAuthenticator((context) => [context.user, context.authStatus]);
  const router = useRouter();
  const pathname = usePathname();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const redirectedRef = useRef(false);
  const lastPathRef = useRef(pathname);

  // Simplified page checks
  const isAuthPage = pathname.match(/^\/(signin|signup)$/);
  const isDashboardPage = pathname.startsWith('/organizer') || 
                          pathname.startsWith('/attendee') || 
                          pathname.startsWith('/presenter');

  // Improved redirection logic with prevention of multiple redirects
  useEffect(() => {
      // Skip if we're already processing a redirect
      if (isRedirecting || lastPathRef.current === pathname) {
        return;
      }

      lastPathRef.current = pathname;

      const handleAuthRouting = async () => {
        // Prevent multiple simultaneous auth checks
        if (redirectedRef.current) return;
        redirectedRef.current = true;

        try {
          // Case 1: Authenticated user on auth pages - redirect to dashboard
          if (user && authStatus === 'authenticated' && isAuthPage) {
            
            setIsRedirecting(true);

            try{
              const userAttributes = await fetchUserAttributes();
              const userRole = userAttributes['custom:role'] || 'attendee';
              const dashboardPath = `/${userRole}/dashboard`;

              // Only log once and only redirect if we're not already there
              console.log('[AUTH] Redirecting to dashboard:', dashboardPath);
              router.replace(dashboardPath);

            } catch (error) {
              // If there's an error getting attributes, sign out and redirect to signin
              console.error('[AUTH] Error getting user attributes:', error);
              // Here you could add signOut() from 'aws-amplify/auth' if you want to force logout
              router.replace('/signin')
            }
            
            // Reset redirect flag after a timeout to prevent immediate re-triggers
            setTimeout(() => {
              setIsRedirecting(false);
            }, 2000); // Longer timeout to ensure navigation completes
    
            return;
          }

          // Case 2: Unauthenticated user on protected pages - redirect to signin
          if ((!user || authStatus !== 'authenticated') && isDashboardPage) {
            console.log('[AUTH] Protected page accessed without auth, redirecting to signin');
            router.replace('/signin');
            return;
          }
        } finally {
          // Reset the redirect flag after a delay
          setTimeout(() => {
            redirectedRef.current = false;
          }, 1000);
        }
      };

      handleAuthRouting();
      // No dependencies on router to avoid loops
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authStatus, isAuthPage, isDashboardPage, pathname]);

  // Loading state during configuration
  if (authStatus === 'configuring') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="text-center p-8 max-w-md w-full mx-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Initializing...</h3>
          <p className="text-gray-600">Please wait a moment</p>
        </div>
      </div>
    );
  }

  // Loading state during redirections
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="text-center p-8 max-w-md w-full mx-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Redirecting...</h3>
          <p className="text-gray-600">Please wait a moment</p>
        </div>
      </div>
    );
  }

  // For auth pages, show the authenticator
  if (isAuthPage) {
    // If already authenticated, don't show login again (will be redirected by the useEffect)
    if (user && authStatus === 'authenticated') {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      );
    }
    
    return (
      <div className="h-full">
        <Authenticator
          initialState={pathname.includes('signup') ? 'signUp' : 'signIn'}
          components={components}
          formFields={formFields}
        >
          {() => <>{children}</>}
        </Authenticator>
      </div>
    );
  }

// For all other cases, just render children
  return <>{children}</>;
};

export default Auth;