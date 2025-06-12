"use client";

import React, { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { Authenticator, Heading, Radio, RadioGroupField, useAuthenticator, View } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { usePathname, useRouter } from 'next/navigation';
import { fetchUserAttributes } from 'aws-amplify/auth';

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

// Update the AuthProvider logic to handle the middleware redirect properly
const Auth = ({ children }: { children: React.ReactNode }) => {
  const { user, authStatus } = useAuthenticator((context) => [context.user, context.authStatus]);
  const router = useRouter();
  const pathname = usePathname();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const isAuthPage = pathname.match(/^\/(signin|signup)$/);
  const isDashboardPage = pathname.startsWith('/organizer') || pathname.startsWith('/attendee');
  const isAuthCheckPage = pathname === '/auth-check';

  // Handle redirect from auth pages to dashboard ONLY
  useEffect(() => {
    const handlePostLogin = async () => {
      if (user && authStatus === 'authenticated' && isAuthPage && !isRedirecting) {
        try {
          setIsRedirecting(true);
          
          const userAttributes = await fetchUserAttributes();
          const userRole = userAttributes['custom:role'] || 'attendee';
          
          console.log('[AUTH PROVIDER] Post-login redirect to:', `/${userRole}/dashboard`);
          router.replace(`/${userRole}/dashboard`);
        } catch (error) {
          console.error('[AUTH PROVIDER] Post-login error:', error);
          router.replace('/attendee/dashboard');
        } finally {
          setTimeout(() => setIsRedirecting(false), 2000);
        }
      }
    };

    handlePostLogin();
  }, [user, authStatus, isAuthPage, router, isRedirecting]);

  // ✅ REMOVED: Dashboard redirect logic that was causing issues
  // Let middleware handle authentication checks, not the auth provider

  // Show loading state only during initial configuration
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

  // Show loading state during post-login redirect
  if (isAuthPage && isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="text-center p-8 max-w-md w-full mx-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Redirecting to dashboard...</h3>
          <p className="text-gray-600">Please wait a moment</p>
        </div>
      </div>
    );
  }

  // For auth-check page, let it handle its own logic
  if (isAuthCheckPage) {
    return <>{children}</>;
  }

  // ✅ SIMPLIFIED: For dashboard pages, just render if user is authenticated
  if (isDashboardPage) {
    if (authStatus === 'authenticated' && user) {
      return <>{children}</>;
    } else {
      // ✅ FIXED: Redirect to signin instead of auth-check
      console.log('[AUTH PROVIDER] Dashboard accessed without auth, redirecting to signin');
      router.replace('/signin');
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      );
    }
  }

  // For auth pages, show the authenticator
  if (isAuthPage) {
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

  // For all other pages (public pages), just render
  return <>{children}</>;
};

export default Auth;
