"use client";

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ControllerRenderProps } from 'react-hook-form';
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
import type { RegisterData } from '@/types';

const Schema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/\d/, 'Password must include at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must include at least one symbol'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type Values = z.infer<typeof Schema>;
type PasswordField =
  | ControllerRenderProps<Values, 'password'>
  | ControllerRenderProps<Values, 'confirmPassword'>;

interface RegisterFormProps {
  onSuccess?: () => void;
}

export default function RegisterForm({ onSuccess }: RegisterFormProps = {}) {
  const { register: registerUser } = useAuth();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: Values) => {
    setError(null);
    setLoading(true);
    try {
      const payload: RegisterData = {
        name: values.name,
        email: values.email,
        password: values.password,
      };
      await registerUser(payload);
      // Use custom success handler or redirect to default login page
      if (onSuccess) {
        onSuccess();
      } else {
        const redirect = params.get('redirect');
        const qs = new URLSearchParams();
        qs.set('email', values.email);
        try {
          const key = `pendingSignUpUsername:${values.email.toLowerCase()}`;
          const username = localStorage.getItem(key);
          if (username) qs.set('username', username);
        } catch {}
        if (redirect) qs.set('redirect', redirect);
        window.location.href = `/confirm?${qs.toString()}`;
      }
    } catch (e) {
      const friendly = mapAmplifyAuthError(e) || handleApiError(e);
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField name="name" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Full name</FormLabel>
            <FormControl>
              <Input placeholder="Jane Doe" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
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
              <PasswordInput field={field} />
            </FormControl>
            <PasswordRequirements password={field.value} />
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="confirmPassword" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Confirm password</FormLabel>
            <FormControl>
              <PasswordInput field={field} placeholder="••••••••" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </Form>
  );
}

function PasswordInput({ field, placeholder = '••••••••' }: { field: PasswordField; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? 'text' : 'password'} placeholder={placeholder} {...field} />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute inset-y-0 right-2 inline-flex items-center justify-center px-2 text-muted-foreground hover:text-foreground focus:outline-none"
        aria-label={show ? 'Hide password' : 'Show password'}
        title={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

function PasswordRequirements({ password }: { password: string }) {
  const hasLength = (password || '').length >= 8;
  const hasNumber = /\d/.test(password || '');
  const hasSymbol = /[^A-Za-z0-9]/.test(password || '');

  return (
    <ul className="mt-2 text-xs text-muted-foreground space-y-1">
      <RequirementItem met={hasLength} text="At least 8 characters" />
      <RequirementItem met={hasNumber} text="Includes at least one number" />
      <RequirementItem met={hasSymbol} text="Includes at least one symbol" />
    </ul>
  );
}

function RequirementItem({ met, text }: { met: boolean; text: string }) {
  return (
    <li className={met ? 'text-green-700' : ''}>
      {met ? '✓' : '•'} {text}
    </li>
  );
}
