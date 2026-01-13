"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getConferenceById, updateConference } from '@/features/conferences/api/conferencesApi';
import type { Conference } from '@/types/conference';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

function getTodayLocalISODate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().min(1, 'End date required'),
  location: z.string().optional(),
  timezone: z.string().min(1, 'Timezone required'),
  topics: z.string().optional(), // comma-separated in UI
  isPublic: z.boolean().optional(),
  websiteUrl: z.string().url('Must be a valid URL').optional().or(z.literal('').transform(() => undefined)),
  venue: z.string().optional(),
  capacity: z.string().regex(/^[0-9]*$/,'Numbers only').optional(),
});

export default function EditConferencePage() {
  const params = useParams();
  const router = useRouter();
  const rawId = (params as { id?: string } )?.id;
  const id = rawId ? Number(rawId) : undefined;
  const [conf, setConf] = useState<Conference | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [form, setForm] = useState({
    name: '', description: '', startDate: '', endDate: '', location: '', timezone: 'UTC', topics: '', isPublic: false,
    websiteUrl: '', venue: '', capacity: '',
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    const run = async () => {
      if (!id) return;
      setLoading(true); setError(undefined);
      try {
        const data = await getConferenceById(id);
        setConf(data);
        setForm({
          name: data.name || '',
          description: data.description || '',
          startDate: data.startDate?.substring(0,10) || '',
          endDate: data.endDate?.substring(0,10) || '',
          location: (data as Conference).location || '',
          timezone: data.timezone || 'UTC',
          topics: (data.topics || []).join(', '),
          // Option B: keep visibility independent from lifecycle; no status fallback
          isPublic: (data as Conference).isPublic ?? false,
          websiteUrl: (data as Conference).websiteUrl || '',
          venue: (data as Conference).venue || '',
          capacity: (data as Conference).capacity ? String((data as Conference).capacity) : '',
        });
      } catch (e: unknown) {
        const msg = typeof e === 'object' && e && 'message' in e ? (e as { message?: string }).message || 'Failed to load conference' : 'Failed to load conference';
        setError(msg);
      } finally { setLoading(false); }
    };
    run();
  }, [id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setErrors({}); setError(undefined);
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as string; fieldErrors[k] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error('Fix validation errors');
      return;
    }
  const { name, description, startDate, endDate, timezone, location, topics, isPublic, websiteUrl, venue, capacity } = parsed.data;

    const today = getTodayLocalISODate();
    const initialStart = conf?.startDate ? conf.startDate.substring(0, 10) : "";
    const initialEnd = conf?.endDate ? conf.endDate.substring(0, 10) : "";

    // Consistent rules: no new past dates; end must be >= start.
    if (startDate && startDate < today && startDate !== initialStart) {
      setErrors((prev) => ({ ...prev, startDate: "Start date can’t be in the past. Choose today or later." }));
      toast.error("Fix validation errors");
      return;
    }
    if (endDate && endDate < today && endDate !== initialEnd) {
      setErrors((prev) => ({ ...prev, endDate: "End date can’t be in the past. Choose today or later." }));
      toast.error("Fix validation errors");
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      setErrors((prev) => ({ ...prev, endDate: "End date can’t be before the start date." }));
      toast.error("Fix validation errors");
      return;
    }
    setSaving(true);
    try {
      await updateConference(id, {
        name: name.trim(),
        description: description?.trim() || '',
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        timezone,
        location,
        topics: (topics || '').split(',').map(s => s.trim()).filter(Boolean),
        isPublic: !!isPublic,
        websiteUrl: websiteUrl?.trim(),
        venue: venue?.trim(),
        capacity: capacity ? Number(capacity) : undefined,
      });
      toast.success('Conference updated');
      router.push(`/organizer/conferences/${id}`);
    } catch (e: unknown) {
      const msg = typeof e === 'object' && e && 'message' in e ? (e as { message?: string }).message || 'Update failed' : 'Update failed';
      setError(msg);
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const onChange = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(v => ({ ...v, [k]: e.target.value }));
  const onDateChange = (k: "startDate" | "endDate") => (v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <section className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Edit Conference</h1>
          {conf && <p className="text-xs text-muted-foreground">Status: <span className="capitalize">{conf.status}</span></p>}
        </div>
        <Button variant="ghost" asChild><a href={`/organizer/conferences/${id}/publish`}>Publish</a></Button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {loading ? (
        <div className="space-y-3 animate-pulse"><div className="h-8 bg-muted rounded" /><div className="h-8 bg-muted rounded" /></div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={onChange('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={onChange('description')} rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start date</Label>
              {(() => {
                const today = getTodayLocalISODate();
                const initialStart = conf?.startDate ? conf.startDate.substring(0, 10) : "";
                const startMin = initialStart && initialStart < today ? undefined : today;
                return (
                  <DateInput
                    value={form.startDate}
                    onChange={onDateChange("startDate")}
                    min={startMin}
                    aria-invalid={!!errors.startDate}
                    className={errors.startDate ? "border-destructive" : undefined}
                  />
                );
              })()}
              {errors.startDate && <p className="text-xs text-destructive">{errors.startDate}</p>}
            </div>
            <div>
              <Label>End date</Label>
              {(() => {
                const today = getTodayLocalISODate();
                const initialEnd = conf?.endDate ? conf.endDate.substring(0, 10) : "";
                const rangeMin = form.startDate && form.startDate > today ? form.startDate : today;
                const endMin = initialEnd && initialEnd < today ? undefined : rangeMin;
                return (
                  <DateInput
                    value={form.endDate}
                    onChange={onDateChange("endDate")}
                    min={endMin}
                    aria-invalid={!!errors.endDate}
                    className={errors.endDate ? "border-destructive" : undefined}
                  />
                );
              })()}
              {errors.endDate && <p className="text-xs text-destructive">{errors.endDate}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={onChange('location')} placeholder="City, Country" />
            </div>
            <div>
              <Label>Timezone</Label>
              <Input value={form.timezone} onChange={onChange('timezone')} placeholder="e.g. UTC" />
              {errors.timezone && <p className="text-xs text-destructive">{errors.timezone}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Venue</Label>
              <Input value={form.venue} onChange={onChange('venue')} placeholder="Convention Center Hall A" />
            </div>
            <div>
              <Label>Website URL</Label>
              <Input value={form.websiteUrl} onChange={onChange('websiteUrl')} placeholder="https://example.org" />
              {errors.websiteUrl && <p className="text-xs text-destructive">{errors.websiteUrl}</p>}
            </div>
          </div>
          <div>
            <Label>Capacity</Label>
            <Input value={form.capacity} onChange={onChange('capacity')} placeholder="e.g. 500" />
            {errors.capacity && <p className="text-xs text-destructive">{errors.capacity}</p>}
          </div>
          <div>
            <Label>Topics (comma-separated)</Label>
            <Input value={form.topics} onChange={onChange('topics')} placeholder="ai, systems, security" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Switch checked={!!form.isPublic} onCheckedChange={(v) => setForm(f => ({ ...f, isPublic: !!v }))} />
              <Label>Public visibility (preview available even in draft mode)</Label>
            </div>
            {conf?.status === 'draft' && form.isPublic && (
              <p className="text-xs text-muted-foreground pl-10">Your conference is visible in preview mode but not yet officially published.</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
            <Button type="button" variant="outline" asChild><a href={`/organizer/conferences/${id}`}>Cancel</a></Button>
          </div>
        </form>
      )}
    </section>
  );
}
