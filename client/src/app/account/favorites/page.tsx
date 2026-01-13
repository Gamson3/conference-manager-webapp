'use client';

import { FavoritesList, FavoritesProvider } from '@/features/favorites';
import { Heart } from 'lucide-react';

export default function AccountFavoritesPage() {
  return (
    <FavoritesProvider>
      <section className="space-y-6">
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-100 rounded-xl p-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Heart className="h-8 w-8 text-red-500 fill-current" />
            My Favorites
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Your saved presentations across all conferences. Click &quot;View in Program&quot; to see the presentation in context.
          </p>
        </div>

        <FavoritesList 
          groupByConference={true}
          showJumpToTree={true}
        />
      </section>
    </FavoritesProvider>
  );
}
