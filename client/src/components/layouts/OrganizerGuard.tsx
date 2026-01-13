"use client";

import React, { Suspense, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function OrganizerGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<OrganizerGuardFallback />}>
      <OrganizerGuardInner>{children}</OrganizerGuardInner>
    </Suspense>
  );
}

function OrganizerGuardFallback() {
  return (
    <div className="p-6">
      <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
      <div className="h-24 w-full bg-muted animate-pulse rounded" />
    </div>
  );
}

function OrganizerGuardInner({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated, isOrganizer, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) return; // Let global app auth/redirect handle sign-in flow
    if (!isOrganizer && !isAdmin) {
      // Avoid redirect loop if already on not-authorized
      if (pathname !== '/not-authorized') {
        const currentQuery = searchParams.toString();
        const fullPath = pathname + (currentQuery ? `?${currentQuery}` : '');
        router.replace(`/not-authorized?from=${encodeURIComponent(fullPath)}`);
      }
    }
  }, [loading, isAuthenticated, isOrganizer, isAdmin, router, pathname, searchParams]);

  if (loading) {
    return <OrganizerGuardFallback />;
  }

  // Render content; if user is not organizer/admin, Not Authorized page will replace view
  return <>{children}</>;
}
