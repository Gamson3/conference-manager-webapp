import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { FavoritesProvider } from '@/features/favorites';
import { ConferenceOverviewPage } from '@/features/conferences/pages';

export default function PublicConferencePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <FavoritesProvider>
        <ConferenceOverviewPage />
      </FavoritesProvider>
    </Suspense>
  );
}
