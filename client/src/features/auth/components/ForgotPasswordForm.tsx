"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { startForgotPassword } from '@/lib/auth/cognito';

const Schema = z.object({ email: z.string().email('Enter a valid email') });
type Values = z.infer<typeof Schema>;

export default function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(Schema), defaultValues: { email: '' } });
  const onSubmit = async ({ email }: Values) => {
    await startForgotPassword(email);
    setSent(true);
  };
  return (
    <div>
      {sent ? (
        <p className="text-sm text-green-700">Code sent. Check your email.</p>
      ) : (
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
            <Button type="submit" className="w-full">Send code</Button>
          </form>
        </Form>
      )}
    </div>
  );
}
