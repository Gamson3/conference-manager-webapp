"use client";

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm, type ControllerRenderProps } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { confirmForgotPassword, startForgotPassword } from '@/lib/auth/cognito';
import { Eye, EyeOff } from 'lucide-react';

const Schema = z.object({
  email: z.string().email('Enter a valid email'),
  code: z.string().min(1, 'Required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/\d/, 'Password must include at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must include at least one symbol'),
});

type Values = z.infer<typeof Schema>;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordSkeleton />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object' && err && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return fallback;
}

function ResetPasswordSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
        <CardDescription className="text-center">Enter the code you received and your new password.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="h-10 bg-muted animate-pulse rounded" />
          <div className="h-10 bg-muted animate-pulse rounded" />
          <div className="h-10 bg-muted animate-pulse rounded" />
          <div className="h-10 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

function ResetPasswordContent() {
  const search = useSearchParams();
  const emailParam = search.get('email') ?? '';
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: { email: emailParam, code: '', newPassword: '' },
  });

  const onSubmit = async (values: Values) => {
    const email = values.email.trim();
    const code = values.code.trim();
    const newPassword = values.newPassword;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await confirmForgotPassword(email, code, newPassword);
      window.location.href = '/login';
    } catch (err: unknown) {
      setSubmitError(getErrorMessage(err, 'Unable to reset password. Please check the code and try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    const email = form.getValues('email').trim();
    setResendMessage(null);
    setResendError(null);
    if (!email) {
      setResendError('Enter your email to resend the code.');
      return;
    }
    setResending(true);
    try {
      await startForgotPassword(email);
      setResendMessage(`A new code was sent to ${email}.`);
    } catch (err: unknown) {
      setResendError(getErrorMessage(err, 'Unable to resend code. Please try again.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
        <CardDescription className="text-center">Enter the code you received and your new password.</CardDescription>
        {emailParam && (
          <p className="text-sm text-green-700 text-center">A confirmation code was sent to {emailParam} — enter the code and choose a new password.</p>
        )}
      </CardHeader>
      <CardContent>
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
            <FormField name="code" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmation code</FormLabel>
                <FormControl>
                  <Input placeholder="123456" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField name="newPassword" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <PasswordInput field={field} />
                </FormControl>
                <PasswordRequirements password={field.value} />
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
                {submitting ? 'Resetting…' : 'Reset password'}
              </Button>
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onResend} disabled={resending}>
                {resending ? 'Sending…' : 'Resend code'}
              </Button>
            </div>
            {(submitError || resendMessage || resendError) && (
              <div className="space-y-1 text-sm">
                {submitError && <p className="text-red-600">{submitError}</p>}
                {resendMessage && <p className="text-green-700">{resendMessage}</p>}
                {resendError && <p className="text-red-600">{resendError}</p>}
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function PasswordInput({
  field,
  placeholder = '••••••••',
}: {
  field: ControllerRenderProps<Values, 'newPassword'>;
  placeholder?: string;
}) {
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
