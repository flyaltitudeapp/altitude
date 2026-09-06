import { and, eq, gte, lte, ne, sql } from 'drizzle-orm';

import { db } from '@/db';
import { getAirline } from '@/db/queries/airline';
import { getUserRank } from '@/db/queries/ranks';
import {
  getRoutesByAirports,
  getRoutesByFlightNumber,
  type RouteWithNumbers,
} from '@/db/queries/routes';
import { getTyperatedAircraftForUser } from '@/db/queries/typeratings';
import { getCareerFlightTimeForUser } from '@/db/queries/users';
import {
  aircraft,
  leaveRequests,
  multipliers,
  type Pirep,
  pireps,
  type Rank,
  users,
} from '@/db/schema';
import type { AutoApprovalMode } from '@/lib/pireps/verification';

export interface AutoApprovalConfig {
  mode: AutoApprovalMode;
  tolerancePercent: number;
  minPireps: number;
}

export interface VerificationContext {
  pirep: Pirep;
  /**
   * Flight time with any multiplier divided back out, so it can be compared
   * against `routes.flightTime`, which is never multiplied. `pireps.flightTime`
   * stores the multiplied value (see domains/pireps/create-pirep.ts).
   */
  baseFlightTime: number;
  aircraftLabel: string;
  routesForPair: RouteWithNumbers[];
  routesForFlightNumber: RouteWithNumbers[];
  /** The route this PIREP is judged against, if one could be identified. */
  matchedRoute: RouteWithNumbers | null;
  pilot: {
    name: string;
    banned: boolean;
    verified: boolean;
  };
  rank: Rank | undefined;
  typeratedAircraftIds: string[];
  approvedPirepCount: number;
  onLeave: boolean;
  duplicateOf: string | null;
  config: AutoApprovalConfig;
}

async function getBaseFlightTime(pirep: Pirep): Promise<number> {
  if (!pirep.multiplierId) {
    return pirep.flightTime;
  }

  const multiplier = await db
    .select({ value: multipliers.value })
    .from(multipliers)
    .where(eq(multipliers.id, pirep.multiplierId))
    .get();

  if (!multiplier || multiplier.value <= 0) {
    return pirep.flightTime;
  }

  return Math.round(pirep.flightTime / multiplier.value);
}

/**
 * Picks the route a PIREP should be judged against. Preferring the route that
 * carries the filed flight number keeps the flight-time and aircraft checks
 * meaningful when an airport pair has several published routes.
 */
function selectMatchedRoute(
  routesForPair: RouteWithNumbers[],
  flightNumber: string
): RouteWithNumbers | null {
  const normalized = flightNumber.trim().toUpperCase();

  const byFlightNumber = routesForPair.find((route) =>
    route.flightNumbers.some((number) => number.toUpperCase() === normalized)
  );

  if (byFlightNumber) {
    return byFlightNumber;
  }

  return routesForPair.length === 1 ? routesForPair[0] : null;
}

async function isOnLeave(userId: string, date: Date): Promise<boolean> {
  const leave = await db
    .select({ id: leaveRequests.id })
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.userId, userId),
        eq(leaveRequests.status, 'approved'),
        lte(leaveRequests.startDate, date),
        gte(leaveRequests.endDate, date)
      )
    )
    .get();

  return Boolean(leave);
}

/**
 * Another PIREP from the same pilot for the same flight on the same calendar
 * day. Denied PIREPs are ignored so a corrected resubmission is not flagged
 * against the entry it replaces.
 */
async function findDuplicate(pirep: Pirep): Promise<string | null> {
  const dayStart = new Date(pirep.date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(pirep.date);
  dayEnd.setHours(23, 59, 59, 999);

  const duplicate = await db
    .select({ id: pireps.id })
    .from(pireps)
    .where(
      and(
        eq(pireps.userId, pirep.userId),
        ne(pireps.id, pirep.id),
        ne(pireps.status, 'denied'),
        eq(pireps.departureIcao, pirep.departureIcao),
        eq(pireps.arrivalIcao, pirep.arrivalIcao),
        sql<boolean>`UPPER(${pireps.flightNumber}) = UPPER(${pirep.flightNumber})`,
        gte(pireps.date, dayStart),
        lte(pireps.date, dayEnd)
      )
    )
    .get();

  return duplicate?.id ?? null;
}

async function countApprovedPireps(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(pireps)
    .where(and(eq(pireps.userId, userId), eq(pireps.status, 'approved')))
    .get();

  return result?.count ?? 0;
}

export async function buildVerificationContext(
  pirep: Pirep
): Promise<VerificationContext> {
  const [
    baseFlightTime,
    airlineData,
    routesForPair,
    routesForFlightNumber,
    pilotRow,
    aircraftRow,
    typeratedAircraft,
    approvedPirepCount,
    onLeave,
    duplicateOf,
  ] = await Promise.all([
    getBaseFlightTime(pirep),
    getAirline(),
    getRoutesByAirports(pirep.departureIcao, pirep.arrivalIcao),
    getRoutesByFlightNumber(pirep.flightNumber),
    db
      .select({
        name: users.name,
        banned: users.banned,
        verified: users.verified,
      })
      .from(users)
      .where(eq(users.id, pirep.userId))
      .get(),
    pirep.aircraftId
      ? db
          .select({ name: aircraft.name, livery: aircraft.livery })
          .from(aircraft)
          .where(eq(aircraft.id, pirep.aircraftId))
          .get()
      : Promise.resolve(undefined),
    getTyperatedAircraftForUser(pirep.userId),
    countApprovedPireps(pirep.userId),
    isOnLeave(pirep.userId, pirep.date),
    findDuplicate(pirep),
  ]);

  // Rank is derived from career hours, so it has to wait on that lookup.
  const careerFlightTime = await getCareerFlightTimeForUser(pirep.userId);
  const rank = await getUserRank(careerFlightTime);

  return {
    pirep,
    baseFlightTime,
    aircraftLabel: aircraftRow
      ? `${aircraftRow.name} (${aircraftRow.livery})`
      : 'Unknown aircraft',
    routesForPair,
    routesForFlightNumber,
    matchedRoute: selectMatchedRoute(routesForPair, pirep.flightNumber),
    pilot: {
      name: pilotRow?.name ?? 'Unknown pilot',
      banned: pilotRow?.banned ?? false,
      verified: pilotRow?.verified ?? false,
    },
    rank,
    typeratedAircraftIds: typeratedAircraft.map((item) => item.id),
    approvedPirepCount,
    onLeave,
    duplicateOf,
    config: {
      mode: airlineData?.autoApprovalMode ?? 'off',
      tolerancePercent: airlineData?.autoApprovalTolerance ?? 20,
      minPireps: airlineData?.autoApprovalMinPireps ?? 0,
    },
  };
}
