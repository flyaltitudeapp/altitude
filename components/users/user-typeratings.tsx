'use client';

import { ChevronDown, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { assignTyperatingAction } from '@/actions/typeratings/assign-typerating';
import { removeTyperatingAction } from '@/actions/typeratings/remove-typerating';
import { TyperatingCard } from '@/components/typeratings/typerating-card';
import { TyperatingSlotCounter } from '@/components/typeratings/typerating-slot-counter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Typerating {
  id: string;
  name: string;
  image: string | null;
}

interface UserTyperatingsProps {
  userId: string;
  heldTyperatings: Typerating[];
  allTyperatings: Typerating[];
  availableSlots: number;
  totalSlots: number;
  canManage: boolean;
}

export function UserTyperatings({
  userId,
  heldTyperatings,
  allTyperatings,
  availableSlots,
  totalSlots,
  canManage,
}: UserTyperatingsProps) {
  const router = useRouter();

  const { execute: assign, isExecuting: isAssigning } = useAction(
    assignTyperatingAction,
    {
      onSuccess: ({ data }) => {
        if (data?.success) {
          toast.success(data.message ?? 'Type rating assigned');
          router.refresh();
        } else if (data?.error) {
          toast.error(data.error);
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Failed to assign type rating');
      },
    }
  );

  const { execute: remove, isExecuting: isRemoving } = useAction(
    removeTyperatingAction,
    {
      onSuccess: ({ data }) => {
        if (data?.success) {
          toast.success(data.message ?? 'Type rating removed');
          router.refresh();
        } else if (data?.error) {
          toast.error(data.error);
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Failed to remove type rating');
      },
    }
  );

  const isBusy = isAssigning || isRemoving;

  const heldIds = new Set(heldTyperatings.map((t) => t.id));
  const assignableTyperatings = allTyperatings.filter(
    (t) => !heldIds.has(t.id)
  );

  return (
    <div className="rounded-lg border border-input bg-panel p-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wide">
              Type Ratings
            </p>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold text-foreground">
                Aircraft Certification
              </h3>
              <TyperatingSlotCounter
                held={heldTyperatings.length}
                total={totalSlots}
              />
            </div>
          </div>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-foreground text-background border border-input hover:bg-foreground/80 transition-colors text-sm font-medium disabled:opacity-50"
                  disabled={isBusy || availableSlots <= 0}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Type Rating
                  <ChevronDown className="ml-2 h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {assignableTyperatings.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No type ratings available to assign.
                  </div>
                ) : (
                  assignableTyperatings.map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => assign({ userId, typeratingId: t.id })}
                      disabled={isBusy}
                    >
                      {t.name}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {heldTyperatings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No type ratings assigned.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {heldTyperatings.map((t) => (
              <TyperatingCard
                key={t.id}
                name={t.name}
                image={t.image}
                onRemove={
                  canManage
                    ? () => remove({ userId, typeratingId: t.id })
                    : undefined
                }
                removing={isBusy}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
