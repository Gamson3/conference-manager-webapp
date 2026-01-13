"use client";

import React, { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';

function AuthCheckInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, loading, user } = useAuth();

  useEffect(() => {
    if (loading) return;
    const redirect = params.get('redirect') || '/';
    if (isAuthenticated) {
      const onboardingCompleted = user?.preferences?.onboarding?.completed === true;
      const needsOnboarding = user?.role === 'user' && !onboardingCompleted;

      if (needsOnboarding && redirect !== '/onboarding') {
        const qs = new URLSearchParams();
        qs.set('redirect', redirect);
        router.replace(`/onboarding?${qs.toString()}`);
        return;
      }

      router.replace(redirect);
    } else {
      const qs = new URLSearchParams();
      qs.set('redirect', redirect);
      router.replace(`/login?${qs.toString()}`);
    }
  }, [loading, isAuthenticated, user, params, router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Checking authentication…</p>
    </div>
  );
}

export default function AuthCheckPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Checking authentication…</p>
        </div>
      }
    >
      <AuthCheckInner />
    </Suspense>
  );
}
