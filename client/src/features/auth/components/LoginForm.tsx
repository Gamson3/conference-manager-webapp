"use client";

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { handleApiError } from '@/lib/api/client';
import { mapAmplifyAuthError } from '@/lib/auth/errors';
import Link from 'next/link';

const Schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type Values = z.infer<typeof Schema>;

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps = {}) {
  const { login } = useAuth();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(Schema), defaultValues: { email: '', password: '' } });

  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (values: Values) => {
    setError(null);
    setLoading(true);
    try {
      await login(values);
      // Use custom success handler or redirect to default dashboard
      if (onSuccess) {
        onSuccess();
      } else {
        const redirect = params.get('redirect') || '/account/dashboard';
        window.location.href = `/auth-check?redirect=${encodeURIComponent(redirect)}`;
      }
    } catch (e) {
      // If the user is not confirmed, push them into the confirm flow
      if (isUserNotConfirmedError(e)) {
        const redirect = params.get('redirect') || '/account/dashboard';
        const qs = new URLSearchParams();
        qs.set('email', values.email);
        try {
          const key = `pendingSignUpUsername:${values.email.toLowerCase()}`;
          const username = localStorage.getItem(key);
          if (username) qs.set('username', username);
        } catch {}
        qs.set('redirect', redirect);
        window.location.href = `/confirm?${qs.toString()}`;
        return;
      }
      // Prefer Cognito-specific mapping; fall back to generic API handler
      const friendly = mapAmplifyAuthError(e) || handleApiError(e);
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField name="email" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField name="password" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...field} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute inset-y-0 right-2 inline-flex items-center justify-center px-2 text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Form>
      <div className="text-sm text-center">
        <Link href="/forgot-password" className="text-link hover:underline">Forgot password?</Link>
      </div>
    </div>
  );
}

function isUserNotConfirmedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: unknown; code?: unknown };
  const name = typeof e.name === 'string' ? e.name : undefined;
  const code = typeof e.code === 'string' ? e.code : undefined;
  return name === 'UserNotConfirmedException' || code === 'UserNotConfirmedException';
}
