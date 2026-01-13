"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { listTypes, createType, updateType, deleteType, PresentationType } from '@/features/conferences/api/conferenceSetupApi';
import { toast } from 'sonner';
import CrudList, { CrudField } from '@/components/shared/CrudList';
import { Switch } from '@/components/ui/switch';

export default function PresentationTypesSetupPage() {
  const params = useParams();
  const rawId = params?.id as string | string[] | undefined;
  const conferenceId = rawId ? Number(rawId) : undefined;

  const [types, setTypes] = useState<PresentationType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [enabled, setEnabled] = useState(true); // UX only for now

  const fields: CrudField[] = [
    { key: 'name', label: 'Name', required: true, placeholder: 'Name (e.g. Talk)' },
    { key: 'description', label: 'Description', placeholder: 'Description' },
    { key: 'defaultDuration', label: 'Default Duration (mins)', type: 'number', widthClass: 'w-40' },
  ];

  const load = useCallback(async () => {
    if (!conferenceId) return;
    setLoading(true); setError(undefined);
    try {
      const data = await listTypes(conferenceId);
      setTypes(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load types';
      setError(message);
    } finally { setLoading(false); }
  }, [conferenceId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (values: Record<string, unknown>) => {
    if (!conferenceId) return;
    try {
      await createType(conferenceId, {
        name: String(values.name ?? ''),
        description: values.description == null ? undefined : String(values.description),
        defaultDuration: values.defaultDuration == null || values.defaultDuration === '' ? undefined : Number(values.defaultDuration),
      });
      toast.success('Type added');
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Create failed';
      setError(message);
      toast.error(message);
    }
  };

  const handleUpdate = async (id: number, values: Record<string, unknown>) => {
    if (!conferenceId) return;
    try {
      await updateType(conferenceId, id, {
        name: String(values.name ?? ''),
        description: values.description == null ? undefined : String(values.description),
        defaultDuration: values.defaultDuration == null || values.defaultDuration === '' ? undefined : Number(values.defaultDuration),
      });
      toast.success('Type updated'); await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Update failed';
      setError(message);
      toast.error(message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!conferenceId) return;
    try { await deleteType(conferenceId, id); toast.success('Type deleted'); await load(); }
    catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Delete failed';
      setError(message);
      toast.error(message);
    }
  };

  return (
    <section className="space-y-6">
      {/* Page title */}
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Presentation Types</h1>
      </div>

      {/* Main card */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-6 space-y-4">
          {/* Toggle row */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base">Presentation Types</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Create presentation types such as &quot;Oral&quot; or &quot;Poster&quot; and have authors submit their abstracts accordingly.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {/* List editor */}
          <div className="mt-4">
            <CrudList
              items={types}
              fields={fields}
              primaryKey="name"
              loading={loading}
              error={error}
              onCreate={handleCreate}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              enableSort={false}
              getDeleteDisabledReason={(item) => {
                const count = (item as PresentationType).presentationsCount ?? 0;
                return count > 0 ? `Used by ${count} presentation${count === 1 ? '' : 's'}` : undefined;
              }}
              confirmDeleteMessage={(item) => {
                const it = item as PresentationType;
                return `Delete presentation type "${it.name || '#' + it.id}"? Presentations using this type may be affected.`;
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
