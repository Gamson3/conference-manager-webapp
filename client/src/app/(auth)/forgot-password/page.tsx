"use client";

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { startForgotPassword } from '@/lib/auth/cognito';

const Schema = z.object({ email: z.string().email('Enter a valid email') });
type Values = z.infer<typeof Schema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const form = useForm<Values>({ resolver: zodResolver(Schema), defaultValues: { email: '' } });

  const onSubmit = async ({ email }: Values) => {
    await startForgotPassword(email);
    // Redirect user to the reset page and prefill their email
    router.push(`/reset-password?email=${encodeURIComponent(email)}`);
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Forgot Password</CardTitle>
        <CardDescription className="text-center">We’ll email you a code to reset your password.</CardDescription>
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
            <Button type="submit" className="w-full">Send code</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
