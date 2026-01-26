"use client";

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { updateAccountProfile } from '@/features/auth/api/authApi';

type ProfileFormState = {
  name: string;
  email: string;
  organization: string;
  jobTitle: string;
  phoneNumber: string;
  address: string;
  bio: string;
  interests: string;
  website: string;
  linkedin: string;
  twitter: string;
};

const emptyForm: ProfileFormState = {
  name: '',
  email: '',
  organization: '',
  jobTitle: '',
  phoneNumber: '',
  address: '',
  bio: '',
  interests: '',
  website: '',
  linkedin: '',
  twitter: '',
};

export default function AccountSettingsPage() {
  const { user, loading, refreshUser, isAuthenticated } = useAuth();
  const [form, setForm] = useState<ProfileFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const socialLinks = useMemo(() => user?.socialLinks ?? {}, [user?.socialLinks]);
  const interests = useMemo(() => (user?.interests ?? []).join(', '), [user?.interests]);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      email: user.email || '',
      organization: user.organization || '',
      jobTitle: user.jobTitle || '',
      phoneNumber: user.phoneNumber || '',
      address: user.address || '',
      bio: user.bio || '',
      interests,
      website: socialLinks.website || '',
      linkedin: socialLinks.linkedin || '',
      twitter: socialLinks.twitter || '',
    });
  }, [user, interests, socialLinks]);

  const handleChange = (field: keyof ProfileFormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAuthenticated) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const interestsArray = form.interests
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    const nextSocialLinks: Record<string, string> = {};
    if (form.website.trim()) nextSocialLinks.website = form.website.trim();
    if (form.linkedin.trim()) nextSocialLinks.linkedin = form.linkedin.trim();
    if (form.twitter.trim()) nextSocialLinks.twitter = form.twitter.trim();

    try {
      await updateAccountProfile({
        name: form.name.trim(),
        organization: form.organization.trim() || undefined,
        jobTitle: form.jobTitle.trim() || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
        address: form.address.trim() || undefined,
        bio: form.bio.trim() || undefined,
        interests: interestsArray.length > 0 ? interestsArray : undefined,
        socialLinks: Object.keys(nextSocialLinks).length > 0 ? nextSocialLinks : undefined,
      });
      await refreshUser();
      setSuccess('Profile updated.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="space-y-4 max-w-2xl">
        <h1 className="text-2xl font-semibold">Account Settings</h1>
        <p className="text-muted-foreground">Loading…</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="space-y-4 max-w-2xl">
        <h1 className="text-2xl font-semibold">Account Settings</h1>
        <p className="text-muted-foreground">Please sign in to manage your profile.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Account Settings</h1>
        <p className="text-muted-foreground">Manage your profile and preferences.</p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Full name</label>
            <Input value={form.name} onChange={handleChange('name')} placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input value={form.email} disabled readOnly />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Organization</label>
            <Input value={form.organization} onChange={handleChange('organization')} placeholder="University or company" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Job title</label>
            <Input value={form.jobTitle} onChange={handleChange('jobTitle')} placeholder="Researcher" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone</label>
            <Input value={form.phoneNumber} onChange={handleChange('phoneNumber')} placeholder="+1 555 123 4567" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Address</label>
            <Input value={form.address} onChange={handleChange('address')} placeholder="City, Country" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Bio</label>
          <Textarea value={form.bio} onChange={handleChange('bio')} placeholder="Short bio" rows={4} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Interests</label>
          <Input value={form.interests} onChange={handleChange('interests')} placeholder="AI, Systems, Security" />
          <p className="text-xs text-muted-foreground">Separate interests with commas.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Website</label>
            <Input value={form.website} onChange={handleChange('website')} placeholder="https://example.com" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">LinkedIn</label>
            <Input value={form.linkedin} onChange={handleChange('linkedin')} placeholder="https://linkedin.com/in/..." />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Twitter/X</label>
            <Input value={form.twitter} onChange={handleChange('twitter')} placeholder="https://x.com/username" />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-700">{success}</p>}

        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </section>
  );
}
