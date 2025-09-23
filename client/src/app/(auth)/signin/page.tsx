"use client";

import { useState } from "react";
import { signIn } from "aws-amplify/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { fetchAuthSession, signOut } from "aws-amplify/auth";


async function checkAndClearExistingSession() {
  try {
    const session = await fetchAuthSession();
    if (session.tokens?.idToken) {
      console.log("Detected existing session, signing out first");
      await signOut();
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error checking session:", error);
    return false;
  }
}

export default function SignInPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Clear any existing session first
      await checkAndClearExistingSession();

      // Now try to sign in
      await signIn({ username, password });
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Hero Section */}
      <div className="hidden md:flex w-2/5 bg-gradient-to-tr from-primary-500 to-primary-700 justify-center items-center">
        <div className="text-white text-center p-10">
          <h1 className="text-4xl font-extrabold mb-4">Welcome Back!</h1>
          <p className="text-lg opacity-80">
            Manage your conferences effortlessly with ConferenceMaster
          </p>
        </div>
      </div>

      {/* Right Form Section */}
      <div className="flex w-full md:w-3/5 justify-center items-center p-6 md:p-8 bg-gray-50">
        <div className="bg-white p-8 md:p-10 w-full max-w-lg space-y-6">
          <h2 className="text-4xl font-semibold">
            Sign In
          </h2>

          {error && <div className="bg-red-50 text-red-600 p-3 rounded-md">{error}</div>}

          <form onSubmit={handleSignIn} className="space-y-8">
            <div>
              {/* <Label htmlFor="username" className="font-medium text-base">Username or Email address</Label> */}
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your Username or Email address"
                required
                className="w-full mt-1 h-13 !text-base placeholder:text-muted-foreground"
              />
            </div>

            <div>
              {/* <Label htmlFor="password" className="font-medium text-base">Password</Label> */}
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  required
                  className="w-full mt-1 pr-10 h-13 !text-base placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-muted-foreground pt-1">
              <Link href="/forgot-password" className="hover:underline text-base">
                Forgot Password?
              </Link>
              <Button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-md px-6 py-2 h-11 shadow"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In →"}
              </Button>
            </div>
          </form>

          <p className="text-center text-muted-foreground text-base mt-4">
            Don't have an account?{" "}
            <Link href="/signup" className="text-blue-500 hover:underline">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}