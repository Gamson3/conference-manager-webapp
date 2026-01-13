"use client";

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { confirmForgotPassword } from '@/lib/auth/cognito';

const Schema = z.object({
  email: z.string().email('Enter a valid email'),
  code: z.string().min(1, 'Required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

type Values = z.infer<typeof Schema>;

export default function ResetPasswordForm() {
  const form = useForm<Values>({ resolver: zodResolver(Schema), defaultValues: { email: '', code: '', newPassword: '' } });
  const onSubmit = async (values: Values) => {
    await confirmForgotPassword(values.email, values.code, values.newPassword);
    window.location.href = '/login';
  };
  return (
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
              <Input type="password" placeholder="••••••••" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full">Reset password</Button>
      </form>
    </Form>
  );
}
