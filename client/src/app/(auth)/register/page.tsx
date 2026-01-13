import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
import RegisterForm from '@/features/auth/components/RegisterForm';

type RegisterPageProps = {
  searchParams?: Promise<{ redirect?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const sp = await searchParams;
  const redirect = sp?.redirect;
  const loginHref = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login';
  return (
    <div className="flex flex-col">
      <Link href="/" className="mb-6 hover:opacity-90 transition-opacity">
        <Image
          src="logo.svg"
          alt="Conference Master Logo"
          width={120}
          height={120}
          className="mx-auto mb-6"
        />
      </Link>
    
        <Card>
        <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
            <CardDescription className="text-center">
            Join Conference Master today
            </CardDescription>
        </CardHeader>
        <CardContent>
            <RegisterForm />
            <div className="text-center text-sm mt-4">
      <span className="text-muted-foreground">Already have an account? </span>
      <Link href={loginHref} className="text-link hover:underline font-medium">
                Sign in
            </Link>
            </div>
        </CardContent>
        </Card>
    </div>
  );
}
