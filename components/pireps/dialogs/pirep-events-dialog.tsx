import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useState } from 'react';

import { getPirepEventsAction } from '@/actions/pireps/get-pirep-events';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ResponsiveDialogFooter } from '@/components/ui/responsive-dialog-footer';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useResponsiveDialog } from '@/hooks/use-responsive-dialog';
import { formatFullCallsign, formatHoursMinutes } from '@/lib/utils';

interface PirepEventsDialogProps {
  pirepId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PirepEvent {
  id: string;
  action: string;
  details: string | null;
  previousValues: string | null;
  newValues: string | null;
  timestamp: Date;
  userId: string | null;
  userName: string | null;
  userCallsign: number | null;
  userImage: string | null;
}

const getActionText = (action: string) => {
  switch (action.toLowerCase()) {
    case 'approved':
      return 'Approved this PIREP';
    case 'auto_approved':
      return 'Approved this PIREP automatically — every check passed';
    case 'denied':
      return 'Denied this PIREP';
    case 'edited':
      return 'Edited this PIREP';
    case 'created':
      return 'Created this PIREP';
    default:
      return `Performed ${action} action`;
  }
};

const formatFieldName = (field: string): string => {
  const fieldMap: Record<string, string> = {
    flightNumber: 'Flight Number',
    departureIcao: 'Departure',
    arrivalIcao: 'Arrival',
    flightTime: 'Flight Time',
    cargo: 'Cargo',
    fuelBurned: 'Fuel Burned',
    comments: 'Comments',
    status: 'Status',
    multiplierId: 'Multiplier',
    aircraftId: 'Aircraft',
    deniedReason: 'Denial Reason',
  };
  return fieldMap[field] || field;
};

const formatFieldValue = (
  field: string,
  value: unknown,
  aircraftNames: Record<string, string>,
  multiplierNames: Record<string, string>
): string => {
  if (
    field === 'aircraftId' &&
    typeof value === 'string' &&
    aircraftNames[value]
  ) {
    return aircraftNames[value];
  }
  if (field === 'multiplierId') {
    if (typeof value === 'string' && multiplierNames[value]) {
      return multiplierNames[value];
    }
    return 'None';
  }
  if (field === 'flightTime' && value) {
    return formatHoursMinutes(Number(value));
  }
  if (field === 'cargo' || field === 'fuelBurned') {
    return value ? Number(value).toLocaleString() : '0';
  }
  return String(value || '');
};

const renderValueChange = (
  previousValues: string | null,
  newValues: string | null,
  aircraftNames: Record<string, string>,
  multiplierNames: Record<string, string>
) => {
  if (!previousValues || !newValues) {
    return null;
  }

  try {
    const prev = JSON.parse(previousValues);
    const next = JSON.parse(newValues);

    const changes = Object.keys({ ...prev, ...next }).filter(
      (key) => prev[key] !== next[key]
    );

    if (changes.length === 0) {
      return null;
    }

    return (
      <div className="mt-3 space-y-2">
        {changes.map((field) => (
          <div key={field} className="py-2">
            <div className="text-xs text-muted-foreground mb-1 font-medium">
              {formatFieldName(field)}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-red-600 dark:text-red-400 font-medium">
                {formatFieldValue(
                  field,
                  prev[field],
                  aircraftNames,
                  multiplierNames
                )}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-green-600 dark:text-green-400 font-medium">
                {formatFieldValue(
                  field,
                  next[field],
                  aircraftNames,
                  multiplierNames
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  } catch {
    return null;
  }
};

export function PirepEventsDialog({
  pirepId,
  open,
  onOpenChange,
}: PirepEventsDialogProps) {
  const { dialogStyles } = useResponsiveDialog();
  const [events, setEvents] = useState<PirepEvent[]>([]);
  const [airlineCallsign, setAirlineCallsign] = useState<string>('');
  const [aircraftNames, setAircraftNames] = useState<Record<string, string>>(
    {}
  );
  const [multiplierNames, setMultiplierNames] = useState<
    Record<string, string>
  >({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { execute, status } = useAction(getPirepEventsAction, {
    onSuccess: ({ data }) => {
      setEvents(data.events);
      setAirlineCallsign(data.airlineCallsign);
      setAircraftNames(data.aircraftNames || {});
      setMultiplierNames(data.multiplierNames || {});
      setErrorMsg(null);
    },
    onError: ({ error }) => {
      setErrorMsg(error.serverError || 'Failed to load events');
    },
  });

  useEffect(() => {
    if (open && status === 'idle') {
      execute({ id: pirepId });
    }
  }, [open, status, execute, pirepId]);

  const isLoading = status === 'executing';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={dialogStyles.className}
        style={dialogStyles.style}
        showCloseButton
        transitionFrom="top-left"
      >
        <DialogHeader>
          <DialogTitle>PIREP History</DialogTitle>
          <DialogDescription>
            All recorded actions for this PIREP
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-96 overflow-auto space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading history...</p>
            </div>
          )}
          {errorMsg && (
            <div className="flex items-center justify-center py-8">
              <p className="text-destructive">{errorMsg}</p>
            </div>
          )}
          {!isLoading && events.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">
                No events recorded for this PIREP.
              </p>
            </div>
          )}
          {events.map((evt: PirepEvent) => (
            <div
              key={evt.id}
              className="flex gap-3 items-start p-4 rounded-md bg-panel"
            >
              {evt.userId ? (
                <UserAvatar
                  user={{
                    id: evt.userId,
                    name: evt.userName ?? '',
                    email: '',
                    image: evt.userImage,
                  }}
                  className="h-10 w-10 flex-shrink-0"
                />
              ) : (
                // No user means the system performed it, so there is no avatar
                // to show and a blank one would read as a missing account.
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                  <Sparkles
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden
                  />
                </span>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-foreground">
                    {evt.userName ?? 'Automated'}
                  </span>
                  {airlineCallsign && evt.userCallsign && (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-foreground">
                      {formatFullCallsign(airlineCallsign, evt.userCallsign)}
                    </span>
                  )}
                  <span className="text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(evt.timestamp), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                {evt.action.toLowerCase() !== 'edited' && (
                  <div className="mb-3">
                    <span className="text-sm text-foreground">
                      {getActionText(evt.action)}
                    </span>
                    {evt.action.toLowerCase() === 'denied' && evt.details && (
                      <span className="text-sm text-muted-foreground ml-1">
                        - {evt.details}
                      </span>
                    )}
                  </div>
                )}

                {evt.action.toLowerCase() === 'edited' &&
                  renderValueChange(
                    evt.previousValues,
                    evt.newValues,
                    aircraftNames,
                    multiplierNames
                  )}
              </div>
            </div>
          ))}
        </div>

        <ResponsiveDialogFooter
          secondaryButton={{
            label: 'Close',
            onClick: () => onOpenChange(false),
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
