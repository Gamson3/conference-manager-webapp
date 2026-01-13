"use client";
import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import CrudList, { CrudField } from "@/components/shared/CrudList";
import { Switch } from "@/components/ui/switch";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  ConferenceCategory,
} from "@/features/conferences/api/conferenceSetupApi";

export default function TopicsAndCategoriesPage() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [categories, setCategories] = useState<ConferenceCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [enabled, setEnabled] = useState(true); // UX only for now

  const fields: CrudField[] = [
    { key: "name", label: "Name", required: true, placeholder: "e.g. Artificial Intelligence" },
    { key: "description", label: "Description", type: "textarea", placeholder: "Optional description" },
  ];

  const load = useCallback(async () => {
    if (!conferenceId) return;
    setLoading(true);
    setError(undefined);
    try {
      const data = await listCategories(conferenceId);
      setCategories(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load categories";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (values: Record<string, unknown>) => {
    if (!conferenceId) return;
    try {
      await createCategory(conferenceId, {
        name: String(values.name ?? ''),
        description: values.description == null ? undefined : String(values.description),
      });
      toast.success("Category created");
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to create category";
      toast.error(message);
      throw e;
    }
  };

  const handleUpdate = async (id: number, values: Record<string, unknown>) => {
    if (!conferenceId) return;
    try {
      await updateCategory(conferenceId, id, {
        name: String(values.name ?? ''),
        description: values.description == null ? undefined : String(values.description),
      });
      toast.success("Category updated");
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to update category";
      toast.error(message);
      throw e;
    }
  };

  const handleDelete = async (id: number) => {
    if (!conferenceId) return;
    try {
      await deleteCategory(conferenceId, id);
      toast.success("Category deleted");
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to delete category";
      toast.error(message);
      throw e;
    }
  };

  const getDeleteDisabledReason = (item: ConferenceCategory) => {
    if (item.presentationsCount && item.presentationsCount > 0) {
      return `Category is used by ${item.presentationsCount} presentation${item.presentationsCount === 1 ? "" : "s"}`;
    }
    return undefined;
  };

  return (
    <section className="space-y-6">
      {/* Page title */}
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Topics & Categories</h1>
      </div>

      {/* Main card */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-6 space-y-4">
          {/* Toggle row */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base">Submission topics / tracks</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Define conference topics/tracks and have authors submit their abstracts accordingly.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {/* List editor */}
          <div className="mt-4">
            <CrudList
              items={categories}
              fields={fields}
              primaryKey="name"
              loading={loading}
              error={error}
              onCreate={handleCreate}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              getDeleteDisabledReason={getDeleteDisabledReason}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
