"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

export type CrudFieldType = 'text' | 'textarea' | 'number' | 'date' | 'select';

export interface CrudField<TItem extends { id: number } = { id: number }> {
  key: string;
  label: string;
  type?: CrudFieldType;
  placeholder?: string;
  required?: boolean;
  widthClass?: string; // optional width override
  options?: Array<{ value: string | number; label: string }>; // for select
  render?: (value: unknown, item: TItem) => React.ReactNode; // custom display renderer in view mode
}

export interface CrudListProps<T extends { id: number } = { id: number }> {
  items: T[];
  fields: Array<CrudField<T>>;
  primaryKey?: string; // which field to emphasize in display
  loading?: boolean;
  error?: string;
  onCreate: (values: Record<string, unknown>) => Promise<void>;
  onUpdate: (id: number, values: Record<string, unknown>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  // Optional enhancements
  getDeleteDisabledReason?: (item: T) => string | undefined; // return string to disable with reason
  confirmDeleteMessage?: (item: T) => string; // customize dialog body
  enableSort?: boolean; // enable drag reordering
  onReorder?: (orderedIds: Array<number>) => Promise<void> | void; // persist new order if desired
  getItemKey?: (item: T) => string | number; // key for DnD (defaults to item.id)
}

function getInitialValues<TItem extends { id: number }>(fields: Array<CrudField<TItem>>) {
  const vals: Record<string, string> = {};
  for (const f of fields) {
    vals[f.key] = '';
  }
  return vals;
}

export default function CrudList<T extends { id: number }>({
  items,
  fields,
  primaryKey,
  loading,
  error,
  onCreate,
  onUpdate,
  onDelete,
  getDeleteDisabledReason,
  confirmDeleteMessage,
  enableSort = false,
  onReorder,
  getItemKey,
}: CrudListProps<T>) {
  // Local create form state
  const [createValues, setCreateValues] = useState<Record<string, string>>(getInitialValues(fields));
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // Track which row (if any) is in edit mode
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sorting state (local ordering)
  const [orderedItems, setOrderedItems] = useState<T[]>(items);
  useEffect(() => {
    setOrderedItems(items);
  }, [items]);
  const getDndId = useCallback((item: T) => String(getItemKey ? getItemKey(item) : item.id), [getItemKey]);
  const dndIds = useMemo(() => orderedItems.map(getDndId), [orderedItems, getDndId]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const updateCreateValue = (key: string, value: string) => {
    setCreateValues(v => ({ ...v, [key]: value }));
  };

  const startEdit = (item: T) => {
    setEditingId(item.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    // simple required validation with inline messages
    const errs: Record<string, string> = {};
    for (const f of fields) {
      if (f.required && !String(createValues[f.key] ?? '').trim()) {
        errs[f.key] = `${f.label} is required`;
      }
    }
    setCreateErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of fields) {
        const raw = createValues[f.key];
        if (f.type === 'number') payload[f.key] = raw === '' ? undefined : Number(raw);
        else payload[f.key] = String(raw || '').trim() || undefined;
      }
      await onCreate(payload);
      setCreateValues(getInitialValues(fields));
      setCreateErrors({});
    } finally {
      setSaving(false);
    }
  };

  // Editing save is handled within each row component to avoid parent re-renders during typing

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try { await onDelete(id); } finally { setDeleting(false); setDeleteTarget(null); }
  };

  const renderCreateFieldInput = (
    f: CrudField<T>,
    val: string,
  ) => {
    const commonProps = {
      value: val ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateCreateValue(f.key, e.target.value),
      placeholder: f.placeholder,
      className: f.widthClass || 'w-full',
    };
    if (f.type === 'select') {
      return (
        <Select
          value={val ?? ''}
          onValueChange={(v) => updateCreateValue(f.key, v)}
        >
          <SelectTrigger className={f.widthClass || 'w-full'}>
            <SelectValue placeholder={f.placeholder || f.label} />
          </SelectTrigger>
          <SelectContent>
            {(f.options || []).map(opt => (
              <SelectItem key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    if (f.type === 'textarea') return <Textarea {...commonProps} />;
    if (f.type === 'number') return <Input type="number" {...commonProps} />;
    if (f.type === 'date') {
      return (
        <DateInput
          value={val ?? ''}
          onChange={(v) => updateCreateValue(f.key, v)}
          className={f.widthClass || 'w-full'}
        />
      );
    }
    return <Input {...commonProps} />;
  };

  // Row component with localized value state; edit mode controlled by parent (single edit at a time)
  const CrudListItem: React.FC<{
    item: T;
    disabledReason?: string;
    isEditing: boolean;
    startEdit: () => void;
    cancelEdit: () => void;
    onDelete: () => void;
  }> = ({ item, disabledReason, isEditing, startEdit, cancelEdit, onDelete }) => {
    const itemRecord = item as unknown as Record<string, unknown>;
    const [values, setValues] = useState<Record<string, string>>(() => {
      const initial: Record<string, string> = {};
      for (const f of fields) {
        const val = itemRecord[f.key];
        if (f.type === 'date' && typeof val === 'string') initial[f.key] = val.substring(0, 10);
        else if (f.type === 'number' && typeof val === 'number') initial[f.key] = String(val);
        else initial[f.key] = val == null ? '' : String(val);
      }
      return initial;
    });
  const [rowSaving, setRowSaving] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
    const firstInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

    useEffect(() => {
      if (!isEditing) return;
      const initial: Record<string, string> = {};
      for (const f of fields) {
        const val = itemRecord[f.key];
        if (f.type === 'date' && typeof val === 'string') initial[f.key] = val.substring(0, 10);
        else if (f.type === 'number' && typeof val === 'number') initial[f.key] = String(val);
        else initial[f.key] = val == null ? '' : String(val);
      }
      setValues(initial);
      setRowErrors({});
      // Focus first input once when entering edit mode
      setTimeout(() => {
        if (firstInputRef.current) {
          firstInputRef.current.focus();
          try {
            const input = firstInputRef.current as HTMLInputElement | HTMLTextAreaElement;
            const len = input.value.length;
            input.setSelectionRange(len, len);
          } catch {}
        }
      }, 0);
    }, [isEditing, itemRecord]);

    const updateValue = (key: string, v: string) => setValues(prev => ({ ...prev, [key]: v }));

    const handleSaveRow = async () => {
      // required field validation with inline messages
      const errs: Record<string, string> = {};
      for (const f of fields) {
        const raw = values[f.key];
        if (f.required && (raw === undefined || String(raw).trim() === '')) {
          errs[f.key] = `${f.label} is required`;
        }
      }
      setRowErrors(errs);
      if (Object.keys(errs).length) return;
      setRowSaving(true);
      try {
        const payload: Record<string, unknown> = {};
        for (const f of fields) {
          const raw = values[f.key];
          if (f.type === 'number') payload[f.key] = raw === '' || raw == null ? undefined : Number(raw);
          else if (f.type === 'date') payload[f.key] = raw;
          else payload[f.key] = String(raw ?? '').trim() || undefined;
        }
        await onUpdate(item.id, payload);
        cancelEdit();
        setRowErrors({});
      } catch (err) {
        console.error('Save failed', err);
      } finally {
        setRowSaving(false);
      }
    };

    if (isEditing) {
      return (
        <>
          <div className="grid gap-2 md:grid-cols-2">
            {fields.map((f, idx) => (
              <div key={`edit-${item.id}-${f.key}`} className="flex flex-col gap-1">
                <label className="text-sm text-muted-foreground">{f.label}{f.required && ' *'}</label>
                {f.type === 'textarea' ? (
                  <Textarea
                    value={values[f.key] ?? ''}
                    onChange={e => updateValue(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className={f.widthClass || 'w-full'}
                    ref={idx === 0 ? (node: HTMLTextAreaElement | null) => { firstInputRef.current = node; } : undefined}
                  />
                ) : f.type === 'number' ? (
                  <Input
                    type="number"
                    value={values[f.key] ?? ''}
                    onChange={e => updateValue(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className={f.widthClass || 'w-full'}
                    ref={idx === 0 ? (node: HTMLInputElement | null) => { firstInputRef.current = node; } : undefined}
                  />
                ) : f.type === 'date' ? (
                  <DateInput
                    value={values[f.key] ?? ''}
                    onChange={(v) => updateValue(f.key, v)}
                    className={f.widthClass || 'w-full'}
                    ref={idx === 0 ? (node: HTMLInputElement | null) => { firstInputRef.current = node; } : undefined}
                  />
                ) : f.type === 'select' ? (
                  <Select value={values[f.key] ?? ''} onValueChange={(v) => updateValue(f.key, v)}>
                    <SelectTrigger className={f.widthClass || 'w-full'}>
                      <SelectValue placeholder={f.placeholder || f.label} />
                    </SelectTrigger>
                    <SelectContent>
                      {(f.options || []).map(opt => (
                        <SelectItem key={String(opt.value)} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={values[f.key] ?? ''}
                    onChange={e => updateValue(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className={f.widthClass || 'w-full'}
                    ref={idx === 0 ? (node: HTMLInputElement | null) => { firstInputRef.current = node; } : undefined}
                  />
                )}
                    {rowErrors[f.key] && <span className="text-[11px] text-destructive">{rowErrors[f.key]}</span>}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveRow} disabled={rowSaving}>Save</Button>
            <Button size="sm" variant="secondary" onClick={cancelEdit} disabled={rowSaving}>Cancel</Button>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="flex items-center justify-between">
          <div className="font-medium">
            {primaryKey && itemRecord[primaryKey] ? String(itemRecord[primaryKey]) : (itemRecord.name ? String(itemRecord.name) : `#${item.id}`)}
          </div>
          <div className="flex gap-2 items-center">
            <Button size="sm" variant="outline" onClick={startEdit}>Edit</Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onDelete}
              disabled={Boolean(disabledReason)}
              title={disabledReason || ''}
            >
              Delete
            </Button>
          </div>
        </div>
        {/* Secondary display: show non-primary fields */}
        <div className="text-sm text-muted-foreground">
          {fields.filter(f => (primaryKey ? f.key !== primaryKey : f.key !== 'name')).map(f => {
            const v = itemRecord[f.key];
            if (v == null || v === '') return null;
            return (
              <div key={`${item.id}-${f.key}`}>
                {f.label}: {f.render ? f.render(v, item) : String(v)}
              </div>
            );
          })}
          {disabledReason && (
            <div className="mt-1 text-[11px] text-amber-600">Cannot delete: {disabledReason}</div>
          )}
        </div>
      </>
    );
  };

  const NonSortableListItemShell: React.FC<{ item: T; children: React.ReactNode; isEditing?: boolean }> = ({ children, isEditing }) => (
    <li
      className={`flex flex-col gap-2 rounded-md border border-border/60 bg-muted/40 px-4 py-3 text-base transition-all duration-150${
        isEditing ? ' shadow-sm bg-background' : ''
      }`}
    >
      {children}
    </li>
  );

  const SortableListItemShell: React.FC<{ item: T; children: React.ReactNode; isEditing?: boolean }> = ({ item, children, isEditing }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: getDndId(item) });
    const style = {
      transform: transform ? CSS.Transform.toString(transform) : undefined,
      transition,
      opacity: isDragging ? 0.7 : 1,
    } as React.CSSProperties;

    return (
      <li
        ref={setNodeRef}
        style={style}
        className={`flex flex-col gap-2 rounded-md border border-border/60 bg-muted/40 px-4 py-3 text-base transition-all duration-150${
          isDragging || isEditing ? ' shadow-sm bg-background' : ''
        }`}
      >
        {children}
        <div className="flex items-center gap-2 text-muted-foreground mt-1">
          <button aria-label="Drag to reorder" className="p-1 rounded hover:bg-muted" {...attributes} {...listeners}>
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-sm">Drag to reorder</span>
        </div>
      </li>
    );
  };

  const listContent = (
    <ul className="space-y-2">
      {(enableSort ? orderedItems : items).map(it => {
        const disabledReason = getDeleteDisabledReason ? getDeleteDisabledReason(it) : undefined;
        return (
          (enableSort ? (
            <SortableListItemShell key={getDndId(it)} item={it} isEditing={editingId === it.id}>
              <CrudListItem
                item={it}
                disabledReason={disabledReason}
                isEditing={editingId === it.id}
                startEdit={() => startEdit(it)}
                cancelEdit={cancelEdit}
                onDelete={() => setDeleteTarget(it)}
              />
            </SortableListItemShell>
          ) : (
            <NonSortableListItemShell key={it.id} item={it} isEditing={editingId === it.id}>
              <CrudListItem
                item={it}
                disabledReason={disabledReason}
                isEditing={editingId === it.id}
                startEdit={() => startEdit(it)}
                cancelEdit={cancelEdit}
                onDelete={() => setDeleteTarget(it)}
              />
            </NonSortableListItemShell>
          ))
        );
      })}
    </ul>
  );

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const oldIndex = dndIds.indexOf(activeId);
    const newIndex = dndIds.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrdered = arrayMove(orderedItems, oldIndex, newIndex);
    setOrderedItems(newOrdered);
    if (onReorder) {
      try { await onReorder(newOrdered.map(it => it.id)); } catch { /* noop */ }
    }
  };

  return (
    <div className="space-y-4">
      {/* Create row */}
      <form
        onSubmit={handleCreate}
        className="rounded-md border border-border/60 bg-muted/40 px-4 py-3 text-base"
      >
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {fields.map((f) => (
            <div key={`create-${f.key}`} className="flex flex-col gap-1">
              <label className="text-sm font-medium text-muted-foreground">
                {f.label}
                {f.required && <span className="text-destructive"> *</span>}
              </label>
              {renderCreateFieldInput(f, createValues[f.key])}
              {createErrors[f.key] && <span className="text-[11px] text-destructive">{createErrors[f.key]}</span>}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button type="submit" size="sm" disabled={saving}>
            Add
          </Button>
          {saving && <span className="text-[11px] text-muted-foreground">Saving…</span>}
        </div>
      </form>

      {/* Error / Loading */}
      {error && <p className="text-destructive text-base">{error}</p>}
      {loading && <div className="space-y-2"><div className="h-10 bg-muted animate-pulse rounded" /><div className="h-10 bg-muted animate-pulse rounded" /></div>}
      {!loading && items.length === 0 && (
        <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-4 text-base text-muted-foreground">
          No items yet.
        </div>
      )}

      {/* List */}
      {enableSort ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={dndIds} strategy={verticalListSortingStrategy}>
            {listContent}
          </SortableContext>
        </DndContext>
      ) : (
        listContent
      )}

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm deletion</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? (confirmDeleteMessage
                    ? confirmDeleteMessage(deleteTarget)
                      : `This action will permanently delete "${(() => {
                          const record = deleteTarget as unknown as Record<string, unknown>;
                          if (primaryKey && record[primaryKey]) return String(record[primaryKey]);
                          if (record.name) return String(record.name);
                          return `#${deleteTarget.id}`;
                        })()}".`)
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget.id)} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
