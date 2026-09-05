'use client';

import { Award, Clock, Medal, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserAvatar } from '@/components/ui/user-avatar';
import { formatHoursMinutes } from '@/lib/utils';

interface FlightTimeLeaderboardRow {
  pilotId: string;
  pilotName: string;
  pilotImage: string | null;
  totalFlightTime: number;
  totalApprovedFlights: number;
}

interface PirepsLeaderboardRow {
  pilotId: string;
  pilotName: string;
  pilotImage: string | null;
  totalApprovedFlights: number;
  totalFlightTime: number;
}

type TimePeriod = 'all' | 30 | 7;

interface CategoryBuckets {
  flightTime: Record<TimePeriod, FlightTimeLeaderboardRow[]>;
  pireps: Record<TimePeriod, PirepsLeaderboardRow[]>;
}

interface LeaderboardTableProps {
  leaderboards: {
    overall: CategoryBuckets;
    career: CategoryBuckets;
  };
  canViewUsers?: boolean;
}

type LeaderboardType = 'flightTime' | 'pireps';
type LeaderboardCategoryTab = 'overall' | 'career';

const EMPTY_LABELS: Record<LeaderboardCategoryTab, string> = {
  overall: 'No approved flights recorded for this period',
  career: 'No approved career flights recorded for this period',
};

export function LeaderboardTable({
  leaderboards,
  canViewUsers = false,
}: LeaderboardTableProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<LeaderboardCategoryTab>('overall');
  const [selectedType, setSelectedType] =
    useState<LeaderboardType>('flightTime');
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(30);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 3:
        return <Award className="h-4 w-4 text-amber-600" />;
      default:
        return null;
    }
  };

  const renderGenericTable = (
    leaderboard: (FlightTimeLeaderboardRow | PirepsLeaderboardRow)[],
    type: LeaderboardType,
    category: LeaderboardCategoryTab
  ) => (
    <div className="overflow-hidden rounded-md border border-border bg-panel shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20 bg-muted/50 font-semibold text-foreground">
                Rank
              </TableHead>
              <TableHead className="min-w-[200px] bg-muted/50 font-semibold text-foreground">
                Pilot
              </TableHead>
              <TableHead className="w-32 bg-muted/50 font-semibold text-foreground text-right">
                {type === 'flightTime' ? 'Flight Time' : 'PIREPs'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard.length === 0 ? (
              <TableRow>
                <TableCell
                  className="px-6 py-12 text-center text-foreground"
                  colSpan={3}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Trophy className="h-8 w-8 text-muted-foreground" />
                    <p className="font-medium text-lg">No pilots found</p>
                    <p className="text-muted-foreground text-sm">
                      {EMPTY_LABELS[category]}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              leaderboard.map((pilot, index) => {
                const rank = index + 1;
                return (
                  <TableRow
                    className="transition-colors hover:bg-muted/30"
                    key={pilot.pilotId}
                  >
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {getRankIcon(rank)}
                        <span className="text-sm font-mono">#{rank}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          user={{
                            id: pilot.pilotId,
                            name: pilot.pilotName,
                            email: '',
                            image: pilot.pilotImage,
                          }}
                          className="h-8 w-8 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground truncate">
                            {canViewUsers ? (
                              <Link
                                href={`/admin/users/${pilot.pilotId}`}
                                className="hover:underline focus:underline outline-none"
                              >
                                {pilot.pilotName}
                              </Link>
                            ) : (
                              pilot.pilotName
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-foreground text-right">
                      {type === 'flightTime'
                        ? formatHoursMinutes(pilot.totalFlightTime)
                        : pilot.totalApprovedFlights}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const buckets = leaderboards[selectedCategory];
  const currentData =
    selectedType === 'flightTime'
      ? buckets.flightTime[selectedPeriod]
      : buckets.pireps[selectedPeriod];

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-col gap-2">
        <Tabs
          value={selectedCategory}
          onValueChange={(value) =>
            setSelectedCategory(value as LeaderboardCategoryTab)
          }
        >
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="overall">Overall</TabsTrigger>
            <TabsTrigger value="career">Career</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Tabs
            value={selectedType}
            onValueChange={(value) => setSelectedType(value as LeaderboardType)}
          >
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger
                value="flightTime"
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Flight Time
              </TabsTrigger>
              <TabsTrigger value="pireps" className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                PIREPs
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Tabs
            value={selectedPeriod.toString()}
            onValueChange={(value) =>
              setSelectedPeriod(
                value === 'all' ? 'all' : (Number(value) as TimePeriod)
              )
            }
          >
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="all">All Time</TabsTrigger>
              <TabsTrigger value="30">30 Days</TabsTrigger>
              <TabsTrigger value="7">7 Days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {renderGenericTable(currentData, selectedType, selectedCategory)}
    </div>
  );
}
