import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
import LoginForm from '@/features/auth/components/LoginForm';

type LoginPageProps = {
    searchParams?: Promise<{ redirect?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
    const sp = await searchParams;
    const redirect = sp?.redirect;
    const registerHref = redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : '/register';
  return (
    <div className="flex flex-col">
        <Link href="/" className="mb-4 hover:opacity-90 transition-opacity">
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
                <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
                <CardDescription className="text-center">
                Sign in to your Conference Master account
                </CardDescription>
            </CardHeader>
            <CardContent>
                <LoginForm />
                <div className="text-center text-sm mt-4">
                <span className="text-muted-foreground">Don&apos;t have an account? </span>
                <Link href={registerHref} className="text-link hover:underline font-medium">
                    Sign up
                </Link>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
