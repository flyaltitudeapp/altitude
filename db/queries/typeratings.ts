import { desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';

import { db } from '@/db';
import { getUserRank } from '@/db/queries/ranks';
import { getCareerFlightTimeForUser } from '@/db/queries/users';
import {
  type Aircraft,
  aircraft,
  pireps,
  ranks,
  type Typerating,
  typeratingAircraft,
  typeratings,
  users,
  userTyperatings,
} from '@/db/schema';

type TyperatingListItem = Typerating & { aircraftCount: number };

async function getTyperatingsPaginated(
  page: number,
  limit: number,
  search?: string
): Promise<{ typeratings: TyperatingListItem[]; total: number }> {
  const offset = (page - 1) * limit;

  const whereCondition = search
    ? sql<boolean>`${typeratings.name} LIKE ${`%${search}%`} COLLATE NOCASE`
    : sql<boolean>`1 = 1`;

  const rows = await db
    .select({
      typerating: typeratings,
      aircraftCount: sql<number>`COUNT(${typeratingAircraft.aircraftId})`.as(
        'aircraftCount'
      ),
      totalCount: sql<number>`COUNT(*) OVER()`.as('totalCount'),
    })
    .from(typeratings)
    .leftJoin(
      typeratingAircraft,
      eq(typeratingAircraft.typeratingId, typeratings.id)
    )
    .where(whereCondition)
    .groupBy(typeratings.id)
    .orderBy(typeratings.name)
    .limit(limit)
    .offset(offset);

  return {
    typeratings: rows.map((r) => ({
      ...r.typerating,
      aircraftCount: r.aircraftCount,
    })),
    total: rows[0]?.totalCount ?? 0,
  };
}

async function getAllTyperatings(): Promise<
  { id: string; name: string; image: string | null }[]
> {
  return db
    .select({
      id: typeratings.id,
      name: typeratings.name,
      image: typeratings.image,
    })
    .from(typeratings)
    .orderBy(typeratings.name);
}

async function getTyperatingAircraft(
  typeratingId: string
): Promise<{ aircraftIds: string[] }> {
  const aircraftIds = await db
    .select({ aircraftId: typeratingAircraft.aircraftId })
    .from(typeratingAircraft)
    .where(eq(typeratingAircraft.typeratingId, typeratingId));

  return { aircraftIds: aircraftIds.map((a) => a.aircraftId) };
}

/**
 * The typeratings a pilot currently holds (admin-assigned).
 */
async function getUserTyperatings(
  userId: string
): Promise<{ id: string; name: string; image: string | null }[]> {
  return db
    .select({
      id: typeratings.id,
      name: typeratings.name,
      image: typeratings.image,
    })
    .from(userTyperatings)
    .innerJoin(typeratings, eq(userTyperatings.typeratingId, typeratings.id))
    .where(eq(userTyperatings.userId, userId))
    .orderBy(typeratings.name);
}

/**
 * Held typeratings for a set of users, keyed by user id. Used to render
 * typerating badges in the admin users table without an N+1 query.
 */
async function getTyperatingsForUsers(
  userIds: string[]
): Promise<Record<string, { id: string; name: string }[]>> {
  if (userIds.length === 0) {
    return {};
  }

  const rows = await db
    .select({
      userId: userTyperatings.userId,
      id: typeratings.id,
      name: typeratings.name,
    })
    .from(userTyperatings)
    .innerJoin(typeratings, eq(userTyperatings.typeratingId, typeratings.id))
    .where(inArray(userTyperatings.userId, userIds))
    .orderBy(typeratings.name);

  const map: Record<string, { id: string; name: string }[]> = {};
  for (const row of rows) {
    (map[row.userId] ??= []).push({ id: row.id, name: row.name });
  }

  return map;
}

/**
 * All users that have a callsign assigned, used to match rows during a CSV
 * type-rating import/export. Returns the numeric callsign as-is.
 */
async function getAllUsersWithCallsign(): Promise<
  { id: string; name: string; callsign: number }[]
> {
  const rows = await db
    .select({ id: users.id, name: users.name, callsign: users.callsign })
    .from(users)
    .where(isNotNull(users.callsign))
    .orderBy(users.callsign);

  return rows.filter(
    (r): r is { id: string; name: string; callsign: number } =>
      r.callsign !== null
  );
}

/**
 * Every (userId, typeratingId) assignment pair. Used to compute the current
 * held state for the whole roster in one query during CSV export/import.
 */
async function getAllUserTyperatingPairs(): Promise<
  { userId: string; typeratingId: string }[]
> {
  return db
    .select({
      userId: userTyperatings.userId,
      typeratingId: userTyperatings.typeratingId,
    })
    .from(userTyperatings);
}

/**
 * Distinct aircraft a pilot is cleared to fly across all held typeratings.
 * This is the career-mode allow-list.
 */
async function getTyperatedAircraftForUser(
  userId: string
): Promise<Aircraft[]> {
  const result = await db
    .selectDistinct({
      id: aircraft.id,
      name: aircraft.name,
      livery: aircraft.livery,
      createdAt: aircraft.createdAt,
      updatedAt: aircraft.updatedAt,
    })
    .from(userTyperatings)
    .innerJoin(
      typeratingAircraft,
      eq(userTyperatings.typeratingId, typeratingAircraft.typeratingId)
    )
    .innerJoin(aircraft, eq(typeratingAircraft.aircraftId, aircraft.id))
    .where(eq(userTyperatings.userId, userId))
    .orderBy(aircraft.name);

  return result as Aircraft[];
}

/**
 * Remaining typerating slots for a pilot: rank's total slots minus held count.
 * Returns 0 when the pilot has no rank or no slots remain.
 */
async function getAvailableTyperatingSlots(userId: string): Promise<number> {
  const careerFlightTime = await getCareerFlightTimeForUser(userId);
  const rank = await getUserRank(careerFlightTime);

  if (!rank || rank.typeRatingSlots <= 0) {
    return 0;
  }

  const held = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(userTyperatings)
    .where(eq(userTyperatings.userId, userId))
    .get();

  const heldCount = held?.count ?? 0;

  return Math.max(0, rank.typeRatingSlots - heldCount);
}

/**
 * Total type rating slots (from each user's current rank) for a set of users,
 * keyed by user id. Batched so the admin users table can show a held/total
 * counter without an N+1 query.
 */
async function getTyperatingSlotTotalsForUsers(
  userIds: string[]
): Promise<Record<string, number>> {
  if (userIds.length === 0) {
    return {};
  }

  const flightRows = await db
    .select({
      userId: pireps.userId,
      minutes:
        sql<number>`COALESCE(SUM(CASE WHEN ${pireps.status} = 'approved' AND ${pireps.category} = 'career' THEN ${pireps.flightTime} ELSE 0 END), 0)`.as(
          'minutes'
        ),
    })
    .from(pireps)
    .where(inArray(pireps.userId, userIds))
    .groupBy(pireps.userId);

  const minutesByUser = new Map<string, number>();
  for (const row of flightRows) {
    minutesByUser.set(row.userId, row.minutes);
  }

  // Highest threshold first, so the first rank at or below the user's hours
  // is their current rank.
  const allRanks = await db
    .select({
      minimumFlightTime: ranks.minimumFlightTime,
      typeRatingSlots: ranks.typeRatingSlots,
    })
    .from(ranks)
    .orderBy(desc(ranks.minimumFlightTime));

  const totals: Record<string, number> = {};
  for (const userId of userIds) {
    const hours = (minutesByUser.get(userId) ?? 0) / 60;
    const rank = allRanks.find((r) => r.minimumFlightTime <= hours);
    totals[userId] = rank?.typeRatingSlots ?? 0;
  }

  return totals;
}

export {
  getAllTyperatings,
  getAllUsersWithCallsign,
  getAllUserTyperatingPairs,
  getAvailableTyperatingSlots,
  getTyperatedAircraftForUser,
  getTyperatingAircraft,
  getTyperatingsForUsers,
  getTyperatingSlotTotalsForUsers,
  getTyperatingsPaginated,
  getUserTyperatings,
};
