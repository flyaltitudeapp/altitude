import { InlineCallsignEditor } from '@/components/users/inline-callsign-editor';
import { formatHoursMinutes } from '@/lib/utils';

interface UserStatsProps {
  user: {
    id: string;
    name: string | null;
    callsign: number | null;
    verified: boolean;
    createdAt: Date | string;
    discordUsername?: string | null;
  };
  pirepCount: number;
  careerPirepCount: number;
  flightTime: number;
  careerFlightTime: number;
  lastPirepDate: Date | string | null;
  airlinePrefix: string;
  callsignMinRange: number;
  callsignMaxRange: number;
  canEdit: boolean;
  enforceCallsignRange?: boolean;
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) {
    return '-';
  }
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function UserStats({
  user,
  pirepCount,
  careerPirepCount,
  flightTime,
  careerFlightTime,
  lastPirepDate,
  airlinePrefix,
  callsignMinRange,
  callsignMaxRange,
  canEdit,
  enforceCallsignRange = true,
}: UserStatsProps) {
  return (
    <div className="rounded-lg border border-input bg-panel p-4 sm:p-6">
      <div className="space-y-4 sm:space-y-6 lg:space-y-0">
        {/* Mobile layout: Stacked */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:hidden">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              Callsign
            </p>
            <div className="mt-2">
              <InlineCallsignEditor
                userId={user.id}
                currentCallsign={user.callsign}
                airlinePrefix={airlinePrefix}
                callsignMinRange={callsignMinRange}
                callsignMaxRange={callsignMaxRange}
                disabled={!canEdit}
                enforceRange={enforceCallsignRange}
              />
            </div>
          </div>

          {user.discordUsername && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">
                Discord
              </p>
              <p className="text-base font-medium mt-2 truncate">
                {user.discordUsername}
              </p>
            </div>
          )}

          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              Total Hours
            </p>
            <p className="text-base font-medium mt-2 truncate">
              {formatHoursMinutes(flightTime)}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              Career Hours
            </p>
            <p className="text-base font-medium mt-2 truncate">
              {formatHoursMinutes(careerFlightTime)}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              Total PIREPs
            </p>
            <p className="text-base font-medium mt-2">{pirepCount}</p>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              Career PIREPs
            </p>
            <p className="text-base font-medium mt-2">{careerPirepCount}</p>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              Last PIREP
            </p>
            <p className="text-base font-medium mt-2 truncate">
              {formatDate(lastPirepDate)}
            </p>
          </div>

          <div className="min-w-0 sm:col-span-2">
            <p className="text-sm font-medium text-muted-foreground">Joined</p>
            <p className="text-base font-medium mt-2 truncate">
              {formatDate(user.createdAt)}
            </p>
          </div>
        </div>

        {/* Desktop layout: Inline */}
        <div className="hidden lg:grid lg:grid-cols-8 lg:gap-6">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              Callsign
            </p>
            <div className="mt-2">
              <InlineCallsignEditor
                userId={user.id}
                currentCallsign={user.callsign}
                airlinePrefix={airlinePrefix}
                callsignMinRange={callsignMinRange}
                callsignMaxRange={callsignMaxRange}
                disabled={!canEdit}
                enforceRange={enforceCallsignRange}
              />
            </div>
          </div>

          {user.discordUsername ? (
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">
                Discord
              </p>
              <p className="text-base font-medium mt-2 truncate">
                {user.discordUsername}
              </p>
            </div>
          ) : (
            <div className="min-w-0" />
          )}

          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              Total Hours
            </p>
            <p className="text-base font-medium mt-2 truncate">
              {formatHoursMinutes(flightTime)}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              Career Hours
            </p>
            <p className="text-base font-medium mt-2 truncate">
              {formatHoursMinutes(careerFlightTime)}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              Total PIREPs
            </p>
            <p className="text-base font-medium mt-2">{pirepCount}</p>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              Career PIREPs
            </p>
            <p className="text-base font-medium mt-2">{careerPirepCount}</p>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              Last PIREP
            </p>
            <p className="text-base font-medium mt-2 truncate">
              {formatDate(lastPirepDate)}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">Joined</p>
            <p className="text-base font-medium mt-2 truncate">
              {formatDate(user.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
