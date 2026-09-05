import { Info } from 'lucide-react';
import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';

import { LeaderboardTable } from '@/components/leaderboard/leaderboard-table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  getLeaderboardByFlightTime,
  getLeaderboardByPireps,
} from '@/db/queries';
import { getCurrentUserRoles, requireAuth } from '@/lib/auth-check';
import { hasRequiredRole } from '@/lib/roles';

export function generateMetadata(): Metadata {
  return {
    title: 'Leaderboard',
  };
}

function getDateRanges() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return {
    allTime: new Date(0),
    thirtyDays: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    sevenDays: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
  };
}

const getCachedLeaderboardData = unstable_cache(
  async () => {
    const { allTime, thirtyDays, sevenDays } = getDateRanges();

    const buildCategoryBuckets = async (
      category: 'casual' | 'career' | undefined
    ) => {
      const [
        flightTimeAll,
        flightTime30Days,
        flightTime7Days,
        pirepsAll,
        pireps30Days,
        pireps7Days,
      ] = await Promise.all([
        getLeaderboardByFlightTime(allTime, category),
        getLeaderboardByFlightTime(thirtyDays, category),
        getLeaderboardByFlightTime(sevenDays, category),
        getLeaderboardByPireps(allTime, category),
        getLeaderboardByPireps(thirtyDays, category),
        getLeaderboardByPireps(sevenDays, category),
      ]);

      return {
        flightTime: {
          all: flightTimeAll,
          30: flightTime30Days,
          7: flightTime7Days,
        },
        pireps: {
          all: pirepsAll,
          30: pireps30Days,
          7: pireps7Days,
        },
      };
    };

    const [overall, career] = await Promise.all([
      buildCategoryBuckets(undefined),
      buildCategoryBuckets('career'),
    ]);

    return { overall, career };
  },
  ['leaderboard-v3'],
  { revalidate: 900 } // 15 minutes
);

export default async function LeaderboardPage() {
  await requireAuth();

  const leaderboardData = await getCachedLeaderboardData();
  const canViewUsers = hasRequiredRole(await getCurrentUserRoles(), ['users']);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="space-y-1 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-2xl md:text-3xl text-foreground break-normal">
              Leaderboard
            </h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Data is cached and updates every 15 minutes</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-muted-foreground">
            Compare your performance with other pilots across different time
            periods
          </p>
        </div>
      </div>

      <LeaderboardTable
        leaderboards={leaderboardData}
        canViewUsers={canViewUsers}
      />
    </div>
  );
}
