// FavoriteButton - Reusable favorite toggle button with optimistic updates
'use client';

import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';
import { useFavoritesContext } from '../context/FavoritesContext';

type ButtonProps = ComponentPropsWithoutRef<typeof Button>;

interface FavoriteButtonProps extends Omit<ButtonProps, 'onClick'> {
  presentationId: string;
  /**
   * Size variant for the button
   */
  buttonSize?: 'sm' | 'default' | 'lg' | 'icon';
  /**
   * Whether to show text alongside the icon
   */
  showLabel?: boolean;
  /**
   * Custom label text
   */
  label?: string;
  /**
   * Callback when favorite status changes
   */
  onFavoriteChange?: (isFavorite: boolean) => void;
}

export function FavoriteButton({
  presentationId,
  buttonSize = 'icon',
  showLabel = false,
  label,
  onFavoriteChange,
  className,
  variant = 'ghost',
  ...props
}: FavoriteButtonProps) {
  // ✅ Always use shared context - no fallback
  const { isFavorite, isPending, toggleFavorite } = useFavoritesContext();

  const favorited = isFavorite(presentationId);
  const pending = isPending(presentationId);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling (e.g., when inside a card)
    e.preventDefault();

    await toggleFavorite(presentationId);
    onFavoriteChange?.(!favorited);
  };

  const displayLabel = label || (favorited ? 'Remove from favorites' : 'Add to favorites');

  return (
    <Button
      variant={variant}
      size={buttonSize}
      className={cn(
        'transition-colors duration-200',
        favorited && 'text-red-500 hover:text-red-600',
        !favorited && 'text-muted-foreground hover:text-red-400',
        pending && 'opacity-50 cursor-wait',
        className
      )}
      onClick={handleClick}
      disabled={pending}
      aria-label={displayLabel}
      title={displayLabel}
      {...props}
    >
      <Heart
        className={cn(
          'h-4 w-4 transition-all duration-200',
          favorited && 'fill-current',
          pending && 'animate-pulse'
        )}
      />
      {showLabel && (
        <span className="ml-2">{favorited ? 'Favorited' : 'Favorite'}</span>
      )}
    </Button>
  );
}

// Standalone version that doesn't use shared state
// Useful for server components or isolated contexts
import { useState as useReactState } from 'react';

export function FavoriteButtonStandalone({
  presentationId,
  initialFavorited = false,
  buttonSize = 'icon',
  showLabel = false,
  label,
  onFavoriteChange,
  className,
  variant = 'ghost',
  ...props
}: Omit<FavoriteButtonProps, 'presentationId'> & {
  presentationId: string;
  initialFavorited?: boolean;
}) {
  const [favorited, setFavorited] = useReactState(initialFavorited);
  const [pending, setPending] = useReactState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    setPending(true);
    try {
      const { toggleFavorite } = await import('../api/favoritesApi');
      const result = await toggleFavorite(presentationId);
      setFavorited(result.isFavorite);
      onFavoriteChange?.(result.isFavorite);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setPending(false);
    }
  };

  const displayLabel = label || (favorited ? 'Remove from favorites' : 'Add to favorites');

  return (
    <Button
      variant={variant}
      size={buttonSize}
      className={cn(
        'transition-colors duration-200',
        favorited && 'text-red-500 hover:text-red-600',
        !favorited && 'text-muted-foreground hover:text-red-400',
        pending && 'opacity-50 cursor-wait',
        className
      )}
      onClick={handleClick}
      disabled={pending}
      aria-label={displayLabel}
      title={displayLabel}
      {...props}
    >
      <Heart
        className={cn(
          'h-4 w-4 transition-all duration-200',
          favorited && 'fill-current',
          pending && 'animate-pulse'
        )}
      />
      {showLabel && (
        <span className="ml-2">{favorited ? 'Favorited' : 'Favorite'}</span>
      )}
    </Button>
  );
}
