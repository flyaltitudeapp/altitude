import type { Metadata } from 'next';

import { PirepForm } from '@/components/pireps/pirep-form';
import {
  getAircraft,
  getAllowedAircraftForRank,
  getFlightTimeForUser,
  getMultipliers,
  getUserRank,
} from '@/db/queries';
import { authCheck } from '@/lib/auth-check';

export function generateMetadata(): Metadata {
  return {
    title: 'File a PIREP',
  };
}

export default async function PirepsPage() {
  const session = await authCheck();

  const flightTime = await getFlightTimeForUser(session.user.id);

  const [aircraft, multipliers, userRank] = await Promise.all([
    (async () => {
      const rank = await getUserRank(flightTime);
      if (rank) {
        return await getAllowedAircraftForRank(rank.id);
      }
      return await getAircraft();
    })(),
    getMultipliers(),
    getUserRank(flightTime),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="space-y-1 w-full md:w-auto">
          <h3 className="font-medium text-2xl md:text-3xl text-foreground break-normal">
            File a PIREP
          </h3>
          <p className="text-muted-foreground">
            Submit your flight report to log your completed flights and earn
            flight hours
          </p>
        </div>
      </div>
      <PirepForm
        aircraft={aircraft}
        multipliers={multipliers}
        maxFlightHours={userRank?.maximumFlightTime ?? null}
      />
    </div>
  );
}
