'use client';

import { useAction } from 'next-safe-action/hooks';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { editRankAction } from '@/actions/ranks/edit-rank';
import { getRankFormDataAction } from '@/actions/ranks/get-rank-form-data';
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

import { RankForm } from './create-rank-dialog';

interface EditRankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rank: {
    id: string;
    name: string;
    minimumFlightTime: number;
    maximumFlightTime: number | null;
    typeRatingSlots: number;
    allowAllAircraft: boolean;
    aircraftIds: string[];
  };
}

export default function EditRankDialog({
  open,
  onOpenChange,
  rank,
}: EditRankDialogProps) {
  const [aircraft, setAircraft] = useState<
    { id: string; name: string; livery: string }[]
  >([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const { dialogStyles } = useResponsiveDialog({
    maxWidth: 'sm:max-w-[500px]',
  });

  const { execute, isPending } = useAction(editRankAction, {
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
        'Failed to update rank'
      );
      toast.error(errorMessage);
    },
  });

  useEffect(() => {
    if (open && !hasLoaded && !isLoadingData) {
      setIsLoadingData(true);
      getRankFormDataAction()
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
          <DialogTitle className="text-foreground">Edit Rank</DialogTitle>
          <DialogDescription className="text-foreground">
            Update rank details and aircraft permissions.
          </DialogDescription>
        </DialogHeader>
        {isLoadingData || !hasLoaded ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        ) : (
          <RankForm
            initialValues={{
              name: rank.name,
              minimumFlightTime: String(rank.minimumFlightTime),
              maximumFlightTime:
                rank.maximumFlightTime !== null
                  ? String(rank.maximumFlightTime)
                  : '',
              typeRatingSlots: String(rank.typeRatingSlots),
              allowAllAircraft: rank.allowAllAircraft,
              selectedAircraftIds: rank.aircraftIds,
            }}
            onSubmit={({
              name,
              minimumFlightTime,
              maximumFlightTime,
              typeRatingSlots,
              allowAllAircraft,
              selectedAircraftIds,
            }: {
              name: string;
              minimumFlightTime: string;
              maximumFlightTime: string;
              typeRatingSlots: string;
              allowAllAircraft: boolean;
              selectedAircraftIds: string[];
            }) => {
              const minFlightTime = Number(minimumFlightTime);
              const maxFlightTime = maximumFlightTime.trim()
                ? Number(maximumFlightTime)
                : null;
              execute({
                id: rank.id,
                name: name.trim(),
                minimumFlightTime: minFlightTime,
                maximumFlightTime: maxFlightTime,
                typeRatingSlots: typeRatingSlots.trim()
                  ? Number(typeRatingSlots)
                  : 0,
                allowAllAircraft,
                aircraftIds: selectedAircraftIds,
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
