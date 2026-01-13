"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { updateAccountProfile } from '@/features/auth/api/authApi';
import type { OnboardingPreferences, UserPreferences } from '@/types';

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingSkeleton() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { isAuthenticated, loading, user, refreshUser, upgradeToOrganizer } = useAuth();

  const firstName = useMemo(() => {
    const raw = (user?.name || '').trim();
    const token = raw.split(' ')[0] || '';
    // If name is missing or looks like our generated Cognito username, fall back
    if (!token || token.startsWith('user_')) return 'there';
    return token;
  }, [user?.name]);

  const redirect = params.get('redirect') || '';

  const defaultAfterOnboarding = useMemo(() => {
    if (redirect) return redirect;
    if (user?.role === 'organizer' || user?.role === 'admin') return '/organizer/conferences';
    return '/account/dashboard';
  }, [redirect, user?.role]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toMessage = (e: unknown) => {
    if (typeof e === 'string') return e;
    if (e instanceof Error) return e.message;
    return null;
  };

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      const qs = new URLSearchParams();
      qs.set('redirect', '/onboarding');
      router.replace(`/login?${qs.toString()}`);
      return;
    }

    const onboardingCompleted = user?.preferences?.onboarding?.completed === true;
    if (onboardingCompleted) {
      router.replace(defaultAfterOnboarding);
    }
  }, [loading, isAuthenticated, user, router, defaultAfterOnboarding]);

  const setOnboardingCompleted = useCallback(async () => {
    const existing: UserPreferences = user?.preferences ?? {};
    const existingOnboarding: OnboardingPreferences = existing.onboarding ?? {};

    const nextPreferences: UserPreferences = {
      ...existing,
      onboarding: {
        ...existingOnboarding,
        completed: true,
        completedAt: new Date().toISOString(),
      },
    };

    await updateAccountProfile({ preferences: nextPreferences });
    await refreshUser();
  }, [user?.preferences, refreshUser]);

  const handleOrganize = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      if (upgradeToOrganizer) {
        await upgradeToOrganizer();
      }

      await setOnboardingCompleted();

      const target = redirect && redirect.startsWith('/organizer') ? redirect : '/organizer/conferences';
      router.replace(target);
    } catch (e: unknown) {
      setError(toMessage(e) || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [upgradeToOrganizer, setOnboardingCompleted, router, redirect]);

  const handleNotNow = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      await setOnboardingCompleted();

      const target = redirect && !redirect.startsWith('/organizer') ? redirect : '/account/dashboard';
      router.replace(target);
    } catch (e: unknown) {
      setError(toMessage(e) || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [setOnboardingCompleted, router, redirect]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {firstName}!</CardTitle>
          <CardDescription>
            Quick setup — Are you here to host a conference, or just explore?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button className="w-full" disabled={busy} onClick={handleOrganize}>
            {busy ? 'Working…' : 'Host a conference'}
          </Button>

          <Button className="w-full" variant="secondary" disabled={busy} onClick={handleNotNow}>
            Just explore for now
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            You can create a conference anytime from the menu.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
