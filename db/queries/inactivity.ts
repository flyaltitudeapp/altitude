import { eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { airline, leaveRequests, pireps, type User, users } from '@/db/schema';

type InactiveUserOutput = Pick<
  User,
  'id' | 'name' | 'callsign' | 'image' | 'email'
> & {
  lastFlight: number | null;
};

/**
 * Get the current time and calculated inactivity cutoff time
 */
async function getInactivityTimeframe() {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const airlineData = await db
    .select({ inactivityPeriod: airline.inactivityPeriod })
    .from(airline)
    .limit(1);
  const inactivityPeriod = airlineData[0]?.inactivityPeriod || 30;
  const daysAgoSeconds = nowSeconds - inactivityPeriod * 24 * 60 * 60;

  return { nowSeconds, daysAgoSeconds };
}

function createLastFlightSubquery() {
  return db
    .select({
      userId: pireps.userId,
      // Last time they submitted a PIREP (any status)
      lastFlight: sql<number>`MAX(${pireps.date})`.as('lastFlight'),
    })
    .from(pireps)
    .groupBy(pireps.userId)
    .as('lf');
}

/**
 * Create inactivity where condition
 */
function createInactivityWhereCondition(
  searchCondition: ReturnType<typeof sql<boolean>>,
  nowSeconds: number,
  daysAgoSeconds: number
) {
  return sql<boolean>`
    ${searchCondition}
    AND EXISTS (
      SELECT 1 FROM ${pireps} p_any
      WHERE p_any.user_id = ${users.id}
    )
    AND NOT EXISTS (
      SELECT 1 FROM ${pireps} p
      WHERE p.user_id = ${users.id}
        AND p.status IN ('approved', 'pending')
        AND p.date >= ${daysAgoSeconds}
    )
    AND NOT EXISTS (
      SELECT 1 FROM ${leaveRequests} lr
      WHERE lr.user_id = ${users.id}
        AND lr.status = 'approved'
        AND lr.start_date <= ${nowSeconds}
        AND lr.end_date >= ${nowSeconds}
    )
  `;
}

/**
 * Retrieves a paginated list of "inactive" users
 * A user is considered inactive if they meet ALL of the following criteria:
 *
 * 1. **No Recent Approved Flights:** They have NOT logged an 'approved' flight within the configured inactivity period
 *    (This means their last approved flight date, if any, is more than the configured days ago, or they have no approved flights at all)
 * AND
 * 2. **No Active Approved Leave:** They do NOT currently have an 'approved' leave request that is active
 *    (An active leave request is one where the current date falls between or on its start and end dates)
 *
 * In simpler terms: A user is deemed inactive if they haven't flown recently *and* are not currently on an approved leave
 * If a user hasn't flown but IS on an approved leave, they are considered "active" due to their leave status
 */
async function getInactiveUsersPaginated(
  page: number,
  limit: number,
  search?: string
): Promise<{ users: InactiveUserOutput[]; total: number }> {
  const offset = (page - 1) * limit;
  const { nowSeconds, daysAgoSeconds } = await getInactivityTimeframe();

  const searchCondition = search
    ? sql<boolean>`(
        ${users.name} LIKE ${`%${search}%`} COLLATE NOCASE 
        OR (${airline.callsign} || CAST(${users.callsign} AS TEXT)) LIKE ${`%${search}%`} COLLATE NOCASE
      )`
    : sql<boolean>`1 = 1`;

  const lastFlightSubquery = createLastFlightSubquery();

  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      callsign: users.callsign,
      image: users.image,
      lastFlight: lastFlightSubquery.lastFlight,
      totalCount: sql<number>`COUNT(*) OVER()`.as('totalCount'),
    })
    .from(users)
    .leftJoin(lastFlightSubquery, eq(users.id, lastFlightSubquery.userId))
    .innerJoin(airline, sql`1 = 1`)
    .where(
      createInactivityWhereCondition(
        searchCondition,
        nowSeconds,
        daysAgoSeconds
      )
    )
    .orderBy(
      sql`COALESCE(${lastFlightSubquery.lastFlight}, 0) DESC`,
      users.name
    )
    .limit(limit)
    .offset(offset);

  return {
    users: result.map(({ ...user }) => user) as InactiveUserOutput[],
    total: result[0]?.totalCount ?? 0,
  };
}

/**
 * Used for cron jobs, no pagination
 */
async function getAllInactiveUsers(): Promise<InactiveUserOutput[]> {
  const { nowSeconds, daysAgoSeconds } = await getInactivityTimeframe();
  const lastFlightSubquery = createLastFlightSubquery();

  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      callsign: users.callsign,
      image: users.image,
      lastFlight: lastFlightSubquery.lastFlight,
    })
    .from(users)
    .leftJoin(lastFlightSubquery, eq(users.id, lastFlightSubquery.userId))
    .innerJoin(airline, sql`1 = 1`)
    .where(
      createInactivityWhereCondition(
        sql<boolean>`1 = 1`,
        nowSeconds,
        daysAgoSeconds
      )
    )
    .orderBy(
      sql`COALESCE(${lastFlightSubquery.lastFlight}, 0) DESC`,
      users.name
    );

  return result as InactiveUserOutput[];
}

export { getAllInactiveUsers, getInactiveUsersPaginated };
