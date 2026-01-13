"use client";
import React, { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Props = {
  visible: boolean;
  saving?: boolean;
  onUndoAll: () => void;
  onSave: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  leftLabel?: string;
  rightLabel?: string;
  className?: string;
  enableNavigationBlocking?: boolean;
};

export default function UnsavedChangesBar({
  visible,
  saving,
  onUndoAll,
  onSave,
  leftLabel = 'Undo All Changes',
  rightLabel = 'Save changes',
  className,
  enableNavigationBlocking = true,
}: Props) {
  const router = useRouter();
  const [showNavigationDialog, setShowNavigationDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Block browser navigation (refresh/close)
  useEffect(() => {
    if (!enableNavigationBlocking || !visible) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // For Chrome/modern browsers
      return ''; // For older browsers
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [visible, enableNavigationBlocking]);

  // Best-effort block for back/forward navigation.
  // Next.js App Router doesn't provide a reliable way to cancel history navigation,
  // so we prompt and, on cancel, immediately return to the current entry.
  useEffect(() => {
    if (!enableNavigationBlocking || !visible) return;

    const handlePopState = () => {
      if (saving) {
        window.history.forward();
        return;
      }

      const ok = window.confirm('There are unsaved changes. Are you sure you want to leave?');
      if (!ok) {
        window.history.forward();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [visible, saving, enableNavigationBlocking]);

  // Block in-app navigation (Next.js router)
  useEffect(() => {
    if (!enableNavigationBlocking || !visible) return;

    // Note: Next.js App Router doesn't have built-in route change events like Pages Router
    // We'll need to handle this differently - intercept link clicks
    const handleClick = (e: MouseEvent) => {
      if (!visible || saving) return;

      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (anchor && anchor.href && anchor.href.startsWith(window.location.origin)) {
        const url = new URL(anchor.href);
        if (url.pathname !== window.location.pathname) {
          e.preventDefault();
          e.stopPropagation();
          setPendingNavigation(url.pathname + url.search);
          setShowNavigationDialog(true);
        }
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [visible, saving, enableNavigationBlocking, router]);

  const handleConfirmNavigation = useCallback(() => {
    setShowNavigationDialog(false);
    if (pendingNavigation) {
      // Temporarily disable blocking for this navigation
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }
  }, [pendingNavigation, router]);

  const handleCancelNavigation = useCallback(() => {
    setShowNavigationDialog(false);
    setPendingNavigation(null);
  }, []);

  if (!visible) return null;

  return (
    <>
      <div className={[
        'sticky bottom-0 inset-x-0 border rounded-md bg-white dark:bg-card shadow-sm p-4',
        'flex items-center justify-between gap-4',
        className || ''
      ].join(' ')}>
        <Button type="button" variant="outline" disabled={!!saving} onClick={onUndoAll}>
          {leftLabel}
        </Button>
        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" disabled={!!saving} onClick={onSave}>
            {saving ? 'Saving…' : rightLabel}
          </Button>
        </div>
      </div>

      <AlertDialog open={showNavigationDialog} onOpenChange={setShowNavigationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are You Sure?</AlertDialogTitle>
            <AlertDialogDescription>
              There are unsaved changes. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelNavigation}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNavigation}>Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
