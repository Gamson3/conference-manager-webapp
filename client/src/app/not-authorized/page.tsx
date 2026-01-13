"use client";

import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function NotAuthorizedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-semibold mb-2">Not authorized</h1>
            <p className="text-muted-foreground mb-6">Loading…</p>
          </div>
        </div>
      }
    >
      <NotAuthorizedInner />
    </Suspense>
  );
}

function NotAuthorizedInner() {
  const { isAuthenticated, isUser, upgradeToOrganizer } = useAuth();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const fromParam = searchParams.get('from') || '';
  const safeReturn = fromParam.startsWith('/organizer') ? fromParam : '/organizer/dashboard';

  const handleUpgrade = async () => {
    if (!upgradeToOrganizer) return;
    setBusy(true);
    setMsg(null);
    try {
      await upgradeToOrganizer();
      setMsg('Upgraded. Redirecting…');
      // Route back to the page the user originally tried to access
      router.replace(safeReturn);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Upgrade failed';
      setMsg(message);
    } finally {
      setBusy(false);
    }
  };

  // If the user already has organizer access (e.g., after upgrade), redirect immediately
  useEffect(() => {
    // We only redirect if authenticated and not a base user anymore
    // Avoid pulling role flags here to keep this page generic; the upgrade flow updates auth state
    if (isAuthenticated && !isUser) {
      router.replace(safeReturn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isUser, safeReturn]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-2">Not authorized</h1>
        <p className="text-muted-foreground mb-6">
          You don’t have permission to view this page.
        </p>
        {isAuthenticated && isUser && (
          <div className="mb-6 space-y-2">
            <p className="text-sm">Want to create and manage conferences?</p>
            <Button onClick={handleUpgrade} disabled={busy}>{busy ? 'Upgrading…' : 'Upgrade to Organizer'}</Button>
            {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <Link href="/" className="underline">Go home</Link>
          {!isAuthenticated && <Link href="/login" className="underline">Sign in</Link>}
        </div>
      </div>
    </div>
  );
}
