import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  createInactiveUsersCondition,
  createLastFlightSubquery,
  getInactivityTimeframe,
} from '@/db/queries/inactivity';
import { airline, pireps, type User, users } from '@/db/schema';

async function getFlightTimeForUser(userId: string): Promise<number> {
  const result = await db
    .select({
      totalFlightTime:
        sql<number>`COALESCE(SUM(CASE WHEN ${pireps.status} = 'approved' THEN ${pireps.flightTime} ELSE 0 END), 0)`.as(
          'totalFlightTime'
        ),
    })
    .from(pireps)
    .where(eq(pireps.userId, userId))
    .get();

  return result?.totalFlightTime ?? 0;
}

async function getCareerFlightTimeForUser(userId: string): Promise<number> {
  const result = await db
    .select({
      careerFlightTime:
        sql<number>`COALESCE(SUM(CASE WHEN ${pireps.status} = 'approved' AND ${pireps.category} = 'career' THEN ${pireps.flightTime} ELSE 0 END), 0)`.as(
          'careerFlightTime'
        ),
    })
    .from(pireps)
    .where(eq(pireps.userId, userId))
    .get();

  return result?.careerFlightTime ?? 0;
}

interface UsersQueryOptions {
  hideInactive?: boolean;
}

async function getUsersPaginated(
  page: number,
  limit: number,
  search?: string,
  options?: UsersQueryOptions
): Promise<{
  users: Array<User & { isInactive: number; lastFlight: number | null }>;
  total: number;
}> {
  const offset = (page - 1) * limit;
  const hideInactive = options?.hideInactive ?? false;

  const searchCondition = search
    ? sql<boolean>`(
        ${users.name} LIKE ${`%${search}%`} COLLATE NOCASE 
        OR ${users.email} LIKE ${`%${search}%`} COLLATE NOCASE 
        OR CAST(${users.callsign} AS TEXT) LIKE ${`%${search}%`} COLLATE NOCASE
        OR ${users.discordUsername} LIKE ${`%${search}%`} COLLATE NOCASE
        OR (${users.callsign} IS NOT NULL AND ${airline.callsign} || CAST(${users.callsign} AS TEXT) LIKE ${`%${search}%`} COLLATE NOCASE)
      )`
    : sql<boolean>`1 = 1`;

  const { nowSeconds, cutoffSeconds } = await getInactivityTimeframe();
  const inactiveCondition = createInactiveUsersCondition(
    nowSeconds,
    cutoffSeconds
  );
  const lastFlightSubquery = createLastFlightSubquery();
  const filterCondition = (
    hideInactive
      ? (and(
          searchCondition,
          eq(users.verified, true),
          eq(users.banned, false),
          sql<boolean>`NOT (${inactiveCondition})`
        ) ?? searchCondition)
      : searchCondition
  ) as ReturnType<typeof sql<boolean>>;

  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      image: users.image,
      verified: users.verified,
      callsign: users.callsign,
      role: users.role,
      banned: users.banned,
      bannedReason: users.bannedReason,
      banExpires: users.banExpires,
      discordUsername: users.discordUsername,
      discourseUsername: users.discourseUsername,
      infiniteFlightId: users.infiniteFlightId,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastFlight: lastFlightSubquery.lastFlight,
      isInactive:
        sql<number>`CASE WHEN ${inactiveCondition} THEN 1 ELSE 0 END`.as(
          'isInactive'
        ),
      totalCount: sql<number>`COUNT(*) OVER()`.as('totalCount'),
    })
    .from(users)
    .leftJoin(lastFlightSubquery, eq(users.id, lastFlightSubquery.userId))
    .leftJoin(airline, sql`1 = 1`)
    .where(filterCondition)
    .orderBy(users.createdAt)
    .limit(limit)
    .offset(offset);

  return {
    users: result.map(({ totalCount: _totalCount, ...user }) => user) as Array<
      User & { isInactive: number; lastFlight: number | null }
    >,
    total: result[0]?.totalCount ?? 0,
  };
}

async function getUnverifiedUsersPaginated(
  page: number,
  limit: number
): Promise<{ users: User[]; total: number }> {
  const offset = (page - 1) * limit;

  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      image: users.image,
      verified: users.verified,
      callsign: users.callsign,
      role: users.role,
      banned: users.banned,
      bannedReason: users.bannedReason,
      banExpires: users.banExpires,
      discordUsername: users.discordUsername,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      totalCount: sql<number>`COUNT(*) OVER()`.as('totalCount'),
    })
    .from(users)
    .where(eq(users.verified, false))
    .orderBy(users.createdAt)
    .limit(limit)
    .offset(offset);

  return {
    users: result.map(({ totalCount: _totalCount, ...user }) => user) as User[],
    total: result[0]?.totalCount ?? 0,
  };
}

async function getUserById(id: string): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.id, id)).get();

  return result ?? null;
}

export {
  getCareerFlightTimeForUser,
  getFlightTimeForUser,
  getUnverifiedUsersPaginated,
  getUserById,
  getUsersPaginated,
};
