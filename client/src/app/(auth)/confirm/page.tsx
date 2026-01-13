"use client";

import { Suspense, useEffect, useMemo, useState, type FormEvent } from 'react';
import { confirmSignUp, resendSignUpCode } from '@/lib/auth/cognito';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ConfirmSignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-4">
            <h1 className="text-2xl font-semibold">Confirm your account</h1>
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        </div>
      }
    >
      <ConfirmSignUpForm />
    </Suspense>
  );
}

function ConfirmSignUpForm() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const params = useSearchParams();
  const router = useRouter();

  const intendedRedirect = params.get('redirect') || '/account/dashboard';
  const postConfirmHref = useMemo(() => {
    const qs = new URLSearchParams();
    if (intendedRedirect) qs.set('redirect', intendedRedirect);
    return qs.toString() ? `/login?${qs.toString()}` : '/login';
  }, [intendedRedirect]);

  const registerHref = useMemo(() => {
    const qs = new URLSearchParams();
    if (intendedRedirect) qs.set('redirect', intendedRedirect);
    return qs.toString() ? `/register?${qs.toString()}` : '/register';
  }, [intendedRedirect]);

  useEffect(() => {
    const qpEmail = params.get('email');
    if (qpEmail && !email) setEmail(qpEmail);
  }, [params, email]);

  const getCognitoUsername = (): string => {
    const qpUsername = params.get('username');
    if (qpUsername) return qpUsername;
    try {
      const key = `pendingSignUpUsername:${email.toLowerCase()}`;
      const stored = localStorage.getItem(key);
      if (stored) return stored;
    } catch {}
    return email;
  };

  const toMessage = (err: unknown, fallback: string): string => {
    if (typeof err === 'string' && err.trim()) return err;
    if (err instanceof Error && err.message) return err.message;

    if (err && typeof err === 'object') {
      const maybe = err as { message?: unknown };
      if (typeof maybe.message === 'string' && maybe.message.trim()) return maybe.message;
    }

    return fallback;
  };

  const onConfirm = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const username = getCognitoUsername();
      await confirmSignUp(username, code);
      try {
        const key = `pendingSignUpUsername:${email.toLowerCase()}`;
        localStorage.removeItem(key);
      } catch {}
      setMessage('Account confirmed. You can now sign in.');
      setTimeout(() => router.push(postConfirmHref), 800);
    } catch (err: unknown) {
      setError(toMessage(err, 'Confirmation failed'));
    } finally {
      setLoading(false);
    }
  };

  const onResend = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const username = getCognitoUsername();
      await resendSignUpCode(username);
      setMessage('Verification code resent. Please check your email.');
    } catch (err: unknown) {
      setError(toMessage(err, 'Could not resend code'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <form onSubmit={onConfirm} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Confirm your account</h1>
        <p className="text-sm text-muted-foreground">
          We sent a verification code to your email. Enter the email you registered with and the code to confirm your account.
        </p>
        {message && <div className="text-green-600 text-sm">{message}</div>}
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="space-y-1">
          <label className="text-sm">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Verification code</label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} required />
        </div>
        <Button type="submit" disabled={loading} className="w-full">{loading ? 'Confirming…' : 'Confirm'}</Button>
        <Button type="button" variant="ghost" disabled={loading || !email} onClick={onResend} className="w-full">Resend code</Button>

        <div className="text-sm text-center">
          <span className="text-muted-foreground">Already confirmed? </span>
          <Link href={postConfirmHref} className="text-link hover:underline font-medium">Sign in</Link>
          <span className="text-muted-foreground"> · </span>
          <Link href={registerHref} className="text-link hover:underline font-medium">Create an account</Link>
        </div>
      </form>
    </div>
  );
}
