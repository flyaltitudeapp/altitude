'use client';

import { X } from 'lucide-react';

import { fileUrl } from '@/lib/urls';
import { cn } from '@/lib/utils';

interface TyperatingCardProps {
  name: string;
  image?: string | null;
  onRemove?: () => void;
  removing?: boolean;
  className?: string;
}

/**
 * Image-forward card for a typerating. Shows the aircraft side image with the
 * name as a bottom label; when no image is set, the name fills the card in a
 * large font.
 */
export function TyperatingCard({
  name,
  image,
  onRemove,
  removing,
  className,
}: TyperatingCardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg border border-input bg-panel',
        className
      )}
    >
      <div className="relative aspect-video w-full">
        {image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fileUrl(image)}
              alt={name}
              draggable={false}
              className="select-none object-contain p-4"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-background/90 via-background/60 to-transparent p-3 pt-10">
              <p className="truncate font-semibold text-foreground">{name}</p>
            </div>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-muted/50 to-muted/10 p-4">
            <p className="text-center text-xl font-bold uppercase leading-tight tracking-wide text-foreground sm:text-2xl">
              {name}
            </p>
          </div>
        )}

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={removing}
            aria-label={`Remove ${name}`}
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm ring-1 ring-input transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
