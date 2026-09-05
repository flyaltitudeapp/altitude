import { PirepCategoryBadge } from '@/components/pireps/pirep-category-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import type { Pirep } from '@/db/schema';
import { formatHoursMinutes } from '@/lib/utils';

interface UserFlightsProps {
  flights: Pirep[];
  userName: string;
}

export function UserFlights({ flights, userName }: UserFlightsProps) {
  return (
    <div className="rounded-lg border border-input bg-panel p-4 sm:p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-foreground">
            {flights.length === 0 ? 'No PIREPs' : 'Recent PIREPs'}
          </h3>
          {flights.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Latest flight reports from {userName}
            </p>
          )}
        </div>

        {flights.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No flights found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {flights.map((flight) => (
              <div
                key={flight.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg bg-background gap-3 sm:gap-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0 flex-1">
                  <div className="font-medium text-foreground truncate">
                    {flight.flightNumber}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <span className="font-mono">{flight.departureIcao}</span>
                    <span>→</span>
                    <span className="font-mono">{flight.arrivalIcao}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatHoursMinutes(flight.flightTime)}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <PirepCategoryBadge category={flight.category} />
                  <StatusBadge status={flight.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
