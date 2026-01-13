"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { createConference, type CreateConferenceInput } from "@/features/conferences/api/conferencesApi";
import ConferenceBasicsForm, { type ConferenceBasicsValues } from "@/features/conferences/components/ConferenceBasicsForm";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoginForm from "@/features/auth/components/LoginForm";
import RegisterForm from "@/features/auth/components/RegisterForm";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function getTodayLocalISODate(): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function NewConferencePublicPage(): React.JSX.Element {
  const router = useRouter();
  const { isAuthenticated, refreshUser, user } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  // Show auth dialog for guest users on mount
  useEffect(() => {
    if (!isAuthenticated) {
      setShowAuthDialog(true);
    }
  }, [isAuthenticated]);

  const [values, setValues] = useState<ConferenceBasicsValues>({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    timezone: "UTC",
    location: "",
    bannerImage: undefined,
  });
  const [error, setError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ConferenceBasicsValues, string>>>({});
  const [saving, setSaving] = useState(false);

  const handleChange = useCallback(
    <K extends keyof ConferenceBasicsValues>(field: K, value: ConferenceBasicsValues[K]) => {
      setValues((prev) => ({ ...prev, [field]: value } as ConferenceBasicsValues));
    },
    []
  );

  const onLogoChange = useCallback(
    (file?: File | null) => {
      if (!file) return handleChange("bannerImage", undefined);
      const reader = new FileReader();
      reader.onload = () => handleChange("bannerImage", reader.result as string);
      reader.readAsDataURL(file);
    },
    [handleChange]
  );

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(undefined);
      setFieldErrors({});

      const fe: Partial<Record<keyof ConferenceBasicsValues, string>> = {};
      const today = getTodayLocalISODate();

      if (!values.name?.trim()) fe.name = "Please enter a conference title.";
      if (!values.startDate) {
        fe.startDate = "Please choose a start date.";
      } else if (values.startDate < today) {
        fe.startDate = "Start date can’t be in the past. Choose today or later.";
      }

      if (!values.endDate) {
        fe.endDate = "Please choose an end date.";
      } else if (values.endDate < today) {
        // Optional rule: end date cannot be in the past (kept friendly even though start>=today usually implies it)
        fe.endDate = "End date can’t be in the past. Choose today or later.";
      }

      if (values.startDate && values.endDate && values.endDate < values.startDate) {
        fe.endDate = "End date can’t be before the start date.";
      }

      if (Object.keys(fe).length) {
        setFieldErrors(fe);
        setError("Please correct the highlighted fields");
        return;
      }

      if (!isAuthenticated) {
        setError("Please sign in to continue");
        return;
      }

      setSaving(true);
      try {
        const wasBaseUser = user?.role === "user";

        const payload: CreateConferenceInput = {
          name: (values.name ?? "").trim(),
          description: (values.description ?? "").trim() || undefined,
          startDate: new Date(values.startDate!).toISOString(),
          endDate: new Date(values.endDate!).toISOString(),
          timezone: values.timezone,
          location: (values.location ?? "").trim() || undefined,
          bannerImageUrl: values.bannerImage,
          isPublic: false,
        };

        // Backend handles atomic upgrade + conference creation.
        // Preserve existing UX: only show the special toast when the user started as a base user.
        await createConference(payload);

        if (wasBaseUser) {
          toast.success("Conference created! You're now an organizer.", {
            description: "You can now create and manage conferences.",
          });
          await refreshUser();
        }
        
        router.replace("/organizer/conferences");
      } catch (err) {
        const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
        setError(apiErr.response?.data?.message || apiErr.message || "Failed to create conference");
      } finally {
        setSaving(false);
      }
    },
    [values, isAuthenticated, router, refreshUser, user]
  );

  return (
    <>
      {/* Auth Dialog for Guest Users */}
      <Dialog open={showAuthDialog} onOpenChange={(open) => {
        if (!open && !isAuthenticated) {
          // If they try to close without authenticating, redirect to landing
          router.push('/');
        }
        setShowAuthDialog(open);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Sign in to host a conference</DialogTitle>
            <DialogDescription>
              Create a free account or sign in to get started. It only takes a minute.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-6">
              <LoginForm onSuccess={() => setShowAuthDialog(false)} />
            </TabsContent>
            <TabsContent value="register" className="mt-6">
              <RegisterForm onSuccess={() => setShowAuthDialog(false)} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <section className="max-w-4xl mx-auto px-6 py-10 space-y-10">

        {/* TOP BAR with back button */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <h1 className="text-2xl font-bold tracking-tight">
            Create a Conference
          </h1>
        </div>

        <p className="text-muted-foreground -mt-6 ml-12">
          Start with the basics. You can configure everything else later.
        </p>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>There was a problem</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* BANNER UPLOAD CARD */}
        <Card className="overflow-hidden">
          <CardHeader>
            <p className="font-medium">Conference Banner</p>
            <p className="text-sm text-muted-foreground">
              Upload a wide banner image for your conference homepage.
              Conference logos are uploaded later in conference settings.
            </p>
          </CardHeader>

          <CardContent>
            <div
              onClick={() => document.getElementById("logo-input")?.click()}
              className="relative rounded-xl border border-dashed bg-muted/40 
                         hover:bg-muted/60 transition cursor-pointer 
                         flex items-center justify-center
                         aspect-[3/1]"
            >
              {values.bannerImage ? (
                <Image
                  src={values.bannerImage}
                  alt="Conference banner preview"
                  fill
                  unoptimized
                  className="object-cover rounded-xl"
                />
              ) : (
                <div className="text-center px-4">
                  <p className="font-medium">Click to upload banner</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recommended: 3:1 ratio • e.g. 1500×500px • JPG or PNG
                  </p>
                </div>
              )}
            </div>

            <Input
              id="logo-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onLogoChange(e.target.files?.[0])}
            />
          </CardContent>
        </Card>

        {/* FORM SECTION */}
        <form onSubmit={onSubmit} className="space-y-10">
          <ConferenceBasicsForm
            mode="create"
            values={values}
            errors={fieldErrors}
            onChange={handleChange}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="px-6">
              {saving ? "Creating…" : "Create Conference"}
            </Button>
          </div>
        </form>
      </section>
    </>
  );
}
