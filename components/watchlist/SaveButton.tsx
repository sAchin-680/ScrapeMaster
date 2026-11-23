'use client';

import { Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWatchlist } from './useWatchlist';

/** Save or unsave a product in the visitor's watchlist. */
export default function SaveButton({
  productId,
  variant = 'icon',
  className,
}: {
  productId: string;
  variant?: 'icon' | 'full';
  className?: string;
}) {
  const { has, toggle } = useWatchlist();
  const saved = has(productId);
  const label = saved ? 'Remove from watchlist' : 'Save to watchlist';

  return (
    <button
      type="button"
      onClick={() => toggle(productId)}
      aria-pressed={saved}
      aria-label={variant === 'icon' ? label : undefined}
      title={label}
      className={cn(
        variant === 'icon'
          ? 'glass-solid grid size-8 place-items-center rounded-full transition hover:scale-110 active:scale-95'
          : 'btn-ghost px-3 py-2 text-sm',
        saved && 'text-accent',
        className,
      )}
    >
      <Bookmark className={cn('size-4', saved && 'fill-current')} aria-hidden />
      {variant === 'full' && (saved ? 'Saved' : 'Save')}
    </button>
  );
}
