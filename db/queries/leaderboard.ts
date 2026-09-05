import { type SQL, sql } from 'drizzle-orm';

import { db } from '@/db';

export type LeaderboardCategory = 'casual' | 'career';

const categoryClause = (category?: LeaderboardCategory): SQL =>
  category ? sql`AND category = ${category}` : sql``;

async function getLeaderboardByFlightTime(
  fromDate: Date,
  category?: LeaderboardCategory
): Promise<
  {
    pilotId: string;
    pilotName: string;
    pilotImage: string | null;
    totalFlightTime: number;
    totalApprovedFlights: number;
  }[]
> {
  const fromTimestamp = Math.floor(fromDate.getTime() / 1000);
  const categoryFilter = categoryClause(category);

  const result = await db.all(sql`
    WITH period_stats AS (
      SELECT
        user_id,
        SUM(flight_time) AS total_flight_time,
        COUNT(*) AS total_flights
      FROM pireps
      WHERE status = 'approved'
        AND date >= ${fromTimestamp}
        ${categoryFilter}
      GROUP BY user_id
    )
    SELECT
      ps.user_id AS pilotId,
      u.name AS pilotName,
      u.image AS pilotImage,
      ps.total_flight_time AS totalFlightTime,
      ps.total_flights AS totalApprovedFlights
    FROM period_stats ps
    JOIN users u ON ps.user_id = u.id
    ORDER BY ps.total_flight_time DESC
    LIMIT 20
  `);

  return result as {
    pilotId: string;
    pilotName: string;
    pilotImage: string | null;
    totalFlightTime: number;
    totalApprovedFlights: number;
  }[];
}

async function getLeaderboardByPireps(
  fromDate: Date,
  category?: LeaderboardCategory
): Promise<
  {
    pilotId: string;
    pilotName: string;
    pilotImage: string | null;
    totalApprovedFlights: number;
    totalFlightTime: number;
  }[]
> {
  const fromTimestamp = Math.floor(fromDate.getTime() / 1000);
  const categoryFilter = categoryClause(category);

  const result = await db.all(sql`
    WITH period_stats AS (
      SELECT
        user_id,
        COUNT(*) AS total_flights,
        SUM(flight_time) AS total_flight_time
      FROM pireps
      WHERE status = 'approved'
        AND date >= ${fromTimestamp}
        ${categoryFilter}
      GROUP BY user_id
    ),
    all_time_stats AS (
      SELECT
        p.user_id,
        SUM(p.flight_time) AS all_time_flight_time
      FROM pireps p
      WHERE p.status = 'approved'
        ${categoryFilter}
        AND p.user_id IN (SELECT user_id FROM period_stats)
      GROUP BY p.user_id
    )
    SELECT
      ps.user_id AS pilotId,
      u.name AS pilotName,
      u.image AS pilotImage,
      ps.total_flights AS totalApprovedFlights,
      COALESCE(ats.all_time_flight_time, ps.total_flight_time) AS totalFlightTime
    FROM period_stats ps
    JOIN users u ON ps.user_id = u.id
    LEFT JOIN all_time_stats ats ON ps.user_id = ats.user_id
    ORDER BY ps.total_flights DESC
    LIMIT 20
  `);

  return result as {
    pilotId: string;
    pilotName: string;
    pilotImage: string | null;
    totalApprovedFlights: number;
    totalFlightTime: number;
  }[];
}

export { getLeaderboardByFlightTime, getLeaderboardByPireps };
