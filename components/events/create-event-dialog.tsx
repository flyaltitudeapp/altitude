'use client';

import { useAction } from 'next-safe-action/hooks';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { createEventAction } from '@/actions/events/create-event';
import { getEventFormDataAction } from '@/actions/events/get-event-form-data';
import { EventForm } from '@/components/events/event-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { type Aircraft, type Multiplier } from '@/db/schema';
import { useResponsiveDialog } from '@/hooks/use-responsive-dialog';
import {
  ActionErrorResponse,
  extractActionErrorMessage,
} from '@/lib/error-handler';

interface CreateEventDialogProps {
  children: React.ReactNode;
}

export default function CreateEventDialog({
  children,
}: CreateEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [multipliers, setMultipliers] = useState<Multiplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const { dialogStyles } = useResponsiveDialog({
    maxWidth: 'sm:max-w-[800px]',
  });

  useEffect(() => {
    if (open && !hasLoaded && !isLoading) {
      setIsLoading(true);
      getEventFormDataAction()
        .then((result) => {
          if (result?.data) {
            setAircraft(result.data.aircraft);
            setMultipliers(result.data.multipliers);
          }
          setHasLoaded(true);
        })
        .catch(() => {
          toast.error('Failed to load form data');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, hasLoaded, isLoading]);

  const { execute, isPending } = useAction(createEventAction, {
    onSuccess: ({ data }) => {
      const result = data as
        | {
            success?: boolean;
            message?: string;
            error?: string;
          }
        | undefined;

      if (result?.success) {
        toast.success(result.message || 'Event created successfully');
        setOpen(false);
        return;
      }

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Event created successfully');
      setOpen(false);
    },
    onError: (errorResponse) => {
      const errorMessage = extractActionErrorMessage(
        errorResponse as ActionErrorResponse,
        'Failed to create event'
      );
      toast.error(errorMessage);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className={dialogStyles.className}
        style={dialogStyles.style}
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">Create Event</DialogTitle>
          <DialogDescription className="text-foreground">
            Create a new event for pilots to participate in.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <EventForm
            aircraft={aircraft}
            multipliers={multipliers}
            onSubmit={(data, imageFile) => {
              execute({
                ...data,
                departureTime: new Date(data.departureTime!),
                multiplierId: data.multiplierId ?? undefined,
                imageFile: imageFile ?? undefined,
                status: data.status,
              });
            }}
            isSubmitting={isPending}
            onCancel={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
