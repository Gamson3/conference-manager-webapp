"use client";

import { useState } from "react";
import { signUp } from "aws-amplify/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "attendee"
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (value: string) => {
    setFormData({ ...formData, role: value });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      setIsLoading(false);
      return;
    }

    try {
      await signUp({
        username: formData.username,
        password: formData.password,
        options: { userAttributes: { email: formData.email, 'custom:role': formData.role } }
      });
      router.push("/signin");
    } catch (err: any) {
      setError(err.message || "Failed to sign up");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Hero Section */}
      <div className="hidden md:flex w-2/5 bg-gradient-to-tr from-primary-500 to-primary-700 justify-center items-center">
        <div className="text-white text-center p-10">
          <h1 className="text-4xl font-extrabold mb-4">Join ConferenceMaster</h1>
          <p className="text-lg opacity-80">
            Create an account to manage or attend conferences easily.
          </p>
        </div>
      </div>

      {/* Right Form Section */}
      <div className="flex w-full md:w-3/5 justify-center items-center p-6 md:p-8 bg-gray-50">
        <div className="bg-white p-8 md:p-10 w-full max-w-lg space-y-6">
          <div>
            <h2 className="text-4xl font-semibold">
              Create Account
            </h2>
            <p className="text-lg">Sign up for free. No credit card required</p>
          </div>

          {error && <div className="bg-red-50 text-red-600 p-3 rounded-md">{error}</div>}

          <form onSubmit={handleSignUp} className="space-y-6">
            <div>
              {/* <Label htmlFor="username">Username</Label> */}
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a username"
                required
                className="w-full mt-1 h-13 !text-base placeholder:text-muted-foreground"
              />
            </div>

            <div>
              {/* <Label htmlFor="email">Email</Label> */}
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
                className="w-full mt-1 h-13 !text-base placeholder:text-muted-foreground"
              />
            </div>

            <div>
              {/* <Label htmlFor="password">Password</Label> */}
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password"
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

            <div>
              {/* <Label htmlFor="confirmPassword">Confirm Password</Label> */}
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  required
                  className="w-full mt-1 pr-10 h-13 !text-base placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <Label>Role</Label>
              <RadioGroup 
                value={formData.role} 
                onValueChange={handleRoleChange} 
                className="flex space-x-6 mt-2 p-1"
              >
                <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors">
                  <RadioGroupItem value="attendee" id="attendee" />
                  <Label htmlFor="attendee">Attendee</Label>
                </div>
                <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors">
                  <RadioGroupItem value="organizer" id="organizer" />
                  <Label htmlFor="organizer">Organizer</Label>
                </div>
              </RadioGroup>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-md px-6 py-2 h-11 shadow mt-3"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Sign Up →"}
            </Button>
          </form>

          <p className="text-base text-center text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link href="/signin" className="text-blue-500 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}