"use client";
import React from 'react';
import type { Conference } from '@/types/conference';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { deleteConference } from '@/features/conferences/api/conferencesApi';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function ConferenceCard({ conf, onDeleted }: { conf: Conference; onDeleted?: (id: number) => void }) {
  const [deleting, setDeleting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const dateStr = `${new Date(conf.startDate).toLocaleDateString()} – ${new Date(conf.endDate).toLocaleDateString()}`;
  const hasMeta = conf.location || conf.venue || conf.capacity || conf.websiteUrl;

  const handleDelete = async () => {
    if (deleting) return;
    try {
      setDeleting(true);
      await deleteConference(conf.id);
      toast.success(`Deleted: ${conf.name}`);
      setConfirmOpen(false);
      // Optimistically remove from parent list if provided
      onDeleted?.(conf.id);
    } catch {
      toast.error('Failed to delete conference');
    } finally {
      setDeleting(false);
    }
  };
  return (
    <Card className="p-4 flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold text-sm truncate" title={conf.name}>{conf.name}</h2>
        <div className="flex items-center gap-2">
          {conf.status === 'draft' && (conf as { isPublic?: boolean }).isPublic && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">Preview</span>
          )}
          <span className="text-xs px-2 py-0.5 rounded bg-muted capitalize">{conf.status}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-3">{conf.description || 'No description provided.'}</p>
      <div className="text-xs text-muted-foreground">{dateStr} · {conf.timezone || 'UTC'}</div>
      {hasMeta && (
        <div className="text-[10px] flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground/90">
          {conf.location && <span title="Location">📍 {conf.location}</span>}
          {conf.venue && <span title="Venue">🏢 {conf.venue}</span>}
          {typeof conf.capacity === 'number' && conf.capacity > 0 && <span title="Capacity">👥 {conf.capacity}</span>}
          {conf.websiteUrl && (
            <a
              href={conf.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-primary transition-colors"
            >🔗 Site</a>
          )}
        </div>
      )}
      <div className="flex items-center justify-between mt-1">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/organizer/conferences/${conf.id}`}>Manage</Link>
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/organizer/conferences/${conf.id}/edit`}>Edit</Link>
          </Button>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="px-2" aria-label="More actions">
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setConfirmOpen(true)} className="text-destructive">
              <Trash2 size={14} className="mr-2" /> Delete
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/organizer/conferences/${conf.id}/edit`}>Edit details</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conference</DialogTitle>
            <DialogDescription>
              Permanently remove “{conf.name}” and all associated data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={deleting} onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Deleting…' : (
                <span className="flex items-center gap-2"><Trash2 size={14}/> Delete</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
