import { eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { type Aircraft, aircraft, rankAircraft, ranks } from '@/db/schema';

async function getAircraft(): Promise<Aircraft[]> {
  const result = await db.select().from(aircraft).orderBy(aircraft.name);
  return result;
}

async function getAircraftById(id: string): Promise<Aircraft | null> {
  const result = await db
    .select()
    .from(aircraft)
    .where(eq(aircraft.id, id))
    .get();
  return result ?? null;
}

async function getAircraftPaginated(
  page: number,
  limit: number,
  search?: string
): Promise<{ aircraft: Aircraft[]; total: number }> {
  const offset = (page - 1) * limit;

  const searchCondition = search
    ? sql<boolean>`(
        ${aircraft.name} LIKE ${`%${search}%`} COLLATE NOCASE
        OR ${aircraft.livery} LIKE ${`%${search}%`} COLLATE NOCASE
      )`
    : sql<boolean>`1 = 1`;

  const result = await db
    .select({
      id: aircraft.id,
      name: aircraft.name,
      livery: aircraft.livery,
      createdAt: aircraft.createdAt,
      updatedAt: aircraft.updatedAt,
      totalCount: sql<number>`COUNT(*) OVER()`.as('totalCount'),
    })
    .from(aircraft)
    .where(searchCondition)
    .orderBy(aircraft.name)
    .limit(limit)
    .offset(offset);

  return {
    aircraft: result.map(
      ({ totalCount: _totalCount, ...aircraft }) => aircraft
    ) as Aircraft[],
    total: result[0]?.totalCount ?? 0,
  };
}

async function getAllowedAircraftForRank(rankId: string): Promise<Aircraft[]> {
  // Single query to get rank info and determine if all aircraft are allowed
  const rankInfo = await db
    .select({
      id: ranks.id,
      allowAllAircraft: ranks.allowAllAircraft,
      minimumFlightTime: ranks.minimumFlightTime,
    })
    .from(ranks)
    .where(eq(ranks.id, rankId))
    .get();

  if (!rankInfo) {
    return [];
  }

  if (rankInfo.allowAllAircraft) {
    return getAircraft();
  }

  // Single query to get all allowed aircraft for this rank
  // Gets aircraft from all ranks with minimum career flight time <= current rank's career minimum flight time
  const result = await db
    .select({
      id: aircraft.id,
      name: aircraft.name,
      livery: aircraft.livery,
      createdAt: aircraft.createdAt,
      updatedAt: aircraft.updatedAt,
    })
    .from(aircraft)
    .innerJoin(rankAircraft, eq(aircraft.id, rankAircraft.aircraftId))
    .innerJoin(ranks, eq(rankAircraft.rankId, ranks.id))
    .where(
      sql<boolean>`${ranks.minimumFlightTime} <= ${rankInfo.minimumFlightTime}`
    )
    .orderBy(aircraft.name);

  // Remove duplicates (same aircraft might be in multiple eligible ranks)
  const uniqueAircraft = result.filter(
    (aircraft, index, self) =>
      index === self.findIndex((a) => a.id === aircraft.id)
  );

  return uniqueAircraft as Aircraft[];
}

export {
  getAircraft,
  getAircraftById,
  getAircraftPaginated,
  getAllowedAircraftForRank,
};
