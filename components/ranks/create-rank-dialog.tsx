'use client';

import { Search, X } from 'lucide-react';
import { Info } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { createRankAction } from '@/actions/ranks/create-rank';
import { getRankFormDataAction } from '@/actions/ranks/get-rank-form-data';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResponsiveDialogFooter } from '@/components/ui/responsive-dialog-footer';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useResponsiveDialog } from '@/hooks/use-responsive-dialog';
import {
  ActionErrorResponse,
  extractActionErrorMessage,
} from '@/lib/error-handler';

interface CreateRankDialogProps {
  children: React.ReactNode;
}

interface RankFormProps {
  initialValues: {
    name: string;
    minimumFlightTime: string;
    maximumFlightTime: string;
    typeRatingSlots: string;
    allowAllAircraft: boolean;
    selectedAircraftIds: string[];
  };
  onSubmit: (values: {
    name: string;
    minimumFlightTime: string;
    maximumFlightTime: string;
    typeRatingSlots: string;
    allowAllAircraft: boolean;
    selectedAircraftIds: string[];
  }) => void;
  onCancel: () => void;
  isPending: boolean;
  aircraft: { id: string; name: string; livery: string }[];
}

export function RankForm({
  initialValues,
  onSubmit,
  onCancel,
  isPending,
  aircraft,
}: RankFormProps) {
  const [name, setName] = useState(initialValues.name);
  const [minimumFlightTime, setMinimumFlightTime] = useState(
    initialValues.minimumFlightTime
  );
  const [maximumFlightTime, setMaximumFlightTime] = useState(
    initialValues.maximumFlightTime
  );
  const [typeRatingSlots, setTypeRatingSlots] = useState(
    initialValues.typeRatingSlots
  );
  const [allowAllAircraft, setAllowAllAircraft] = useState(
    initialValues.allowAllAircraft
  );
  const [selectedAircraftIds, setSelectedAircraftIds] = useState<string[]>(
    initialValues.selectedAircraftIds
  );
  const [aircraftSearch, setAircraftSearch] = useState('');

  const toggleAircraft = (id: string) => {
    setSelectedAircraftIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const removeAircraft = (id: string) => {
    setSelectedAircraftIds((prev) => prev.filter((a) => a !== id));
  };

  const handleAllowAllAircraftChange = (checked: boolean) => {
    setAllowAllAircraft(checked);
    if (checked) {
      setSelectedAircraftIds([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Rank name is required');
      return;
    }
    if (name.trim().length > 100) {
      toast.error('Rank name must be 100 characters or less');
      return;
    }
    if (!minimumFlightTime.trim()) {
      toast.error('Minimum career flight time is required');
      return;
    }
    const minFlightTime = Number(minimumFlightTime);
    if (isNaN(minFlightTime) || minFlightTime < 0) {
      toast.error('Minimum career flight time must be a valid number');
      return;
    }
    if (!allowAllAircraft && selectedAircraftIds.length === 0) {
      toast.error(
        'Select at least one aircraft or enable "Allow All Aircraft"'
      );
      return;
    }
    onSubmit({
      name: name.trim(),
      minimumFlightTime: minimumFlightTime,
      maximumFlightTime: maximumFlightTime,
      typeRatingSlots: typeRatingSlots,
      allowAllAircraft,
      selectedAircraftIds,
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Rank Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First Officer"
            maxLength={100}
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="minimumFlightTime">
              Minimum Career Flight Time (hours)
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    The minimum career flight hours required for a pilot to be
                    eligible for this rank.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="minimumFlightTime"
            type="number"
            value={minimumFlightTime}
            onChange={(e) => setMinimumFlightTime(e.target.value)}
            placeholder="0"
            min="0"
            required
          />
        </div>
      </div>
      <div className="space-y-2 mt-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="maximumFlightTime">Maximum Flight Time (hours)</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  The maximum flight time allowed for a single flight with this
                  rank. Leave empty for no limit.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id="maximumFlightTime"
          type="number"
          value={maximumFlightTime}
          onChange={(e) => setMaximumFlightTime(e.target.value)}
          placeholder="100 (leave empty for no limit)"
          min="0"
          className="w-full"
        />
      </div>
      <div className="space-y-2 mt-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="typeRatingSlots">Type Rating Slots</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  How many type ratings a pilot at this rank may hold. Slots do
                  not stack across ranks. Default is 0.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id="typeRatingSlots"
          type="number"
          value={typeRatingSlots}
          onChange={(e) => setTypeRatingSlots(e.target.value)}
          placeholder="0"
          min="0"
          className="w-full"
        />
      </div>
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox
            id="allowAllAircraft"
            checked={allowAllAircraft}
            onCheckedChange={handleAllowAllAircraftChange}
          />
          <Label
            htmlFor="allowAllAircraft"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Allow All Aircraft
          </Label>
        </div>
        {!allowAllAircraft && (
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              Aircraft Permissions
            </p>
            {!aircraft || aircraft.length === 0 ? (
              <div className="flex items-center justify-center border border-border p-4 rounded-md bg-background text-muted-foreground">
                <p className="text-sm">
                  No aircraft in fleet. Add aircraft before creating ranks.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search aircraft..."
                    value={aircraftSearch}
                    onChange={(e) => setAircraftSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {selectedAircraftIds.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedAircraftIds.map((id) => {
                      const ac = aircraft.find((a) => a.id === id);
                      return ac ? (
                        <Badge key={id} variant="secondary" className="gap-1">
                          {ac.name} - {ac.livery}
                          <button
                            type="button"
                            className="ml-1 rounded hover:bg-primary/20 focus:outline-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAircraft(id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
                <div className="max-h-48 overflow-y-auto border border-border rounded-md bg-background">
                  {aircraft
                    .filter((ac) => !selectedAircraftIds.includes(ac.id))
                    .filter(
                      (ac) =>
                        ac.name
                          .toLowerCase()
                          .includes(aircraftSearch.toLowerCase()) ||
                        ac.livery
                          .toLowerCase()
                          .includes(aircraftSearch.toLowerCase())
                    )
                    .map((ac) => (
                      <label
                        key={ac.id}
                        className="flex items-center gap-2 p-2 text-sm hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedAircraftIds.includes(ac.id)}
                          onCheckedChange={() => toggleAircraft(ac.id)}
                          id={ac.id}
                        />
                        <span className="flex-1">
                          {ac.name} - {ac.livery}
                        </span>
                      </label>
                    ))}
                  {aircraft
                    .filter((ac) => !selectedAircraftIds.includes(ac.id))
                    .filter(
                      (ac) =>
                        ac.name
                          .toLowerCase()
                          .includes(aircraftSearch.toLowerCase()) ||
                        ac.livery
                          .toLowerCase()
                          .includes(aircraftSearch.toLowerCase())
                    ).length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      {aircraftSearch
                        ? `No aircraft found matching "${aircraftSearch}"`
                        : 'All aircraft selected'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <ResponsiveDialogFooter
        primaryButton={{
          label: 'Save',
          disabled: isPending,
          loading: isPending,
          loadingLabel: 'Saving...',
          type: 'submit',
        }}
        secondaryButton={{
          label: 'Cancel',
          onClick: onCancel,
          disabled: isPending,
        }}
      />
    </form>
  );
}

export default function CreateRankDialog({ children }: CreateRankDialogProps) {
  const [open, setOpen] = useState(false);
  const [aircraft, setAircraft] = useState<
    { id: string; name: string; livery: string }[]
  >([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const { dialogStyles } = useResponsiveDialog({
    maxWidth: 'sm:max-w-[500px]',
  });

  const { execute, isPending } = useAction(createRankAction, {
    onSuccess: (args) => {
      const { data } = args;
      if (data?.success) {
        toast.success(data.message);
        setOpen(false);
      } else if (data?.error) {
        toast.error(data.error);
      }
    },
    onError: (errorResponse) => {
      const errorMessage = extractActionErrorMessage(
        errorResponse as ActionErrorResponse,
        'Failed to add rank'
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className={`${dialogStyles.className} max-w-[400px]`}
        style={dialogStyles.style}
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">Add New Rank</DialogTitle>
          <DialogDescription className="text-foreground">
            Enter rank details and configure aircraft permissions.
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
              name: '',
              minimumFlightTime: '',
              maximumFlightTime: '',
              typeRatingSlots: '',
              allowAllAircraft: false,
              selectedAircraftIds: [],
            }}
            onSubmit={({
              name,
              minimumFlightTime,
              maximumFlightTime,
              typeRatingSlots,
              allowAllAircraft,
              selectedAircraftIds,
            }) => {
              const minFlightTime = Number(minimumFlightTime);
              const maxFlightTime = maximumFlightTime.trim()
                ? Number(maximumFlightTime)
                : null;
              execute({
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
            onCancel={() => setOpen(false)}
            isPending={isPending}
            aircraft={aircraft}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
