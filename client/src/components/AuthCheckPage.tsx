"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchUserAttributes } from 'aws-amplify/auth';

export default function AuthCheckPage() {
  const { user, authStatus } = useAuthenticator();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/attendee/dashboard';
  const [isValidating, setIsValidating] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Checking authentication...');

  useEffect(() => {
    const validateAndRedirect = async () => {
      try {
        console.log('[AUTH CHECK] Starting validation:', {
          authStatus,
          hasUser: !!user,
          redirectPath
        });

        // Update loading message
        setLoadingMessage('Initializing...');

        // Wait for auth to be ready
        if (authStatus === 'configuring') {
          return;
        }

        // If not authenticated, redirect to signin
        if (!user || authStatus !== 'authenticated') {
          console.log('[AUTH CHECK] Not authenticated, redirecting to signin');
          setLoadingMessage('Redirecting to sign in...');
          router.replace('/signin');
          return;
        }

        setLoadingMessage('Verifying permissions...');

        // Get user role
        const userAttributes = await fetchUserAttributes();
        const userRole = userAttributes['custom:role'] || 'attendee';
        
        console.log('[AUTH CHECK] User role:', userRole, 'Requested path:', redirectPath);

        // Check if user is trying to access the correct dashboard
        const isOrganizerRoute = redirectPath.startsWith('/organizer');
        const isAttendeeRoute = redirectPath.startsWith('/attendee');
        
        if ((userRole === 'organizer' && isAttendeeRoute) || 
            (userRole === 'attendee' && isOrganizerRoute)) {
          // Redirect to correct dashboard
          const correctPath = `/${userRole}/dashboard`;
          console.log('[AUTH CHECK] Wrong dashboard, redirecting to:', correctPath);
          setLoadingMessage(`Redirecting to ${userRole} dashboard...`);
          
          // Small delay to show the message
          setTimeout(() => {
            router.replace(correctPath);
          }, 500);
          return;
        }

        // All checks passed, redirect to original path
        console.log('[AUTH CHECK] Access granted, redirecting to:', redirectPath);
        setLoadingMessage('Loading dashboard...');
        
        // Small delay to show the message
        setTimeout(() => {
          router.replace(redirectPath);
        }, 500);

      } catch (error) {
        console.error('[AUTH CHECK] Error:', error);
        setLoadingMessage('Authentication error...');
        setTimeout(() => {
          router.replace('/signin');
        }, 1000);
      } finally {
        // Don't set isValidating to false here - let the redirect handle it
      }
    };

    validateAndRedirect();
  }, [user, authStatus, redirectPath, router]);

  // Always show loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="text-center p-8 max-w-md w-full mx-4">
        <div className="relative mb-6">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-primary-100 rounded-full animate-pulse"></div>
          </div>
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          {loadingMessage}
        </h3>
        
        <p className="text-gray-600 mb-4">
          Please wait while we verify your access
        </p>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary-600 h-2 rounded-full transition-all duration-1000 ease-out animate-pulse"
            style={{ width: '70%' }}
          ></div>
        </div>
      </div>
    </div>
  );
}