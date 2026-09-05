'use client';

import { useAction } from 'next-safe-action/hooks';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { editTyperatingAction } from '@/actions/typeratings/edit-typerating';
import { getTyperatingFormDataAction } from '@/actions/typeratings/get-typerating-form-data';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useResponsiveDialog } from '@/hooks/use-responsive-dialog';
import {
  ActionErrorResponse,
  extractActionErrorMessage,
} from '@/lib/error-handler';

import { TyperatingForm } from './create-typerating-dialog';

interface EditTyperatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typerating: {
    id: string;
    name: string;
    image: string | null;
    aircraftIds: string[];
  };
}

export default function EditTyperatingDialog({
  open,
  onOpenChange,
  typerating,
}: EditTyperatingDialogProps) {
  const [aircraft, setAircraft] = useState<
    { id: string; name: string; livery: string }[]
  >([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const { dialogStyles } = useResponsiveDialog({
    maxWidth: 'sm:max-w-[500px]',
  });

  const { execute, isPending } = useAction(editTyperatingAction, {
    onSuccess: (args) => {
      const { data } = args;
      if (data?.success) {
        toast.success(data.message);
        onOpenChange(false);
      }
    },
    onError: (errorResponse) => {
      const errorMessage = extractActionErrorMessage(
        errorResponse as ActionErrorResponse,
        'Failed to update type rating'
      );
      toast.error(errorMessage);
    },
  });

  useEffect(() => {
    if (open && !hasLoaded && !isLoadingData) {
      setIsLoadingData(true);
      getTyperatingFormDataAction()
        .then((result) => {
          if (result?.data) {
            setAircraft(result.data.aircraft);
          }
          setHasLoaded(true);
        })
        .catch((error) => {
          const errorMessage = extractActionErrorMessage(
            error as ActionErrorResponse,
            'Failed to load form data'
          );
          toast.error(errorMessage);
        })
        .finally(() => {
          setIsLoadingData(false);
        });
    }
  }, [open, hasLoaded, isLoadingData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={dialogStyles.className}
        style={dialogStyles.style}
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Edit Type Rating
          </DialogTitle>
          <DialogDescription className="text-foreground">
            Update the name and covered aircraft.
          </DialogDescription>
        </DialogHeader>
        {isLoadingData || !hasLoaded ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        ) : (
          <TyperatingForm
            initialValues={{
              name: typerating.name,
              selectedAircraftIds: typerating.aircraftIds,
              image: typerating.image,
            }}
            onSubmit={({
              name,
              selectedAircraftIds,
              imageFile,
              removeImage,
            }) => {
              execute({
                id: typerating.id,
                name: name.trim(),
                aircraftIds: selectedAircraftIds,
                imageFile: imageFile ?? undefined,
                removeImage,
              });
            }}
            onCancel={() => onOpenChange(false)}
            isPending={isPending}
            aircraft={aircraft}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
