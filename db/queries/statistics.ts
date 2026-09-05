import { sql } from 'drizzle-orm';

import { db } from '@/db';
import type {
  ActivePilotStatistics,
  FlightHoursStatistics,
  FlightStatistics,
  PeriodDates,
  PilotStatistics,
  SparklineData,
  StatisticsData,
  StatisticsTabsData,
  TabStatistics,
  TimePeriod,
  TimeSeriesDataPoint,
} from '@/types/statistics';

export type Stats = {
  totalPireps: number;
  totalFlightTime: number;
  totalPilots: number;
};

const toTimestamp = (date: Date) => Math.floor(date.getTime() / 1000);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const createDateRange = (days: number, now = new Date()): PeriodDates => ({
  startDate: new Date(now.getTime() - days * MS_PER_DAY),
  endDate: now,
  previousStartDate: new Date(now.getTime() - days * 2 * MS_PER_DAY),
  previousEndDate: new Date(now.getTime() - days * MS_PER_DAY),
});

const calculateChange = (current: number, previous: number) => ({
  value: current - previous,
  percentage: previous > 0 ? ((current - previous) / previous) * 100 : 0,
});

async function getAllStatisticsData(
  currentStart: Date,
  currentEnd: Date,
  previousStart: Date,
  previousEnd: Date
) {
  const currentStartTs = toTimestamp(currentStart);
  const currentEndTs = toTimestamp(currentEnd);
  const previousStartTs = toTimestamp(previousStart);
  const previousEndTs = toTimestamp(previousEnd);

  const result = await db.get<{
    // Current period totals
    current_flights: number;
    current_hours: number;
    current_active_pilots: number;
    current_new_pilots: number;

    // Previous period totals
    previous_flights: number;
    previous_hours: number;
    previous_active_pilots: number;
    previous_new_pilots: number;

    // Global totals
    total_users: number;
    current_active_rate: number;
    previous_active_rate: number;
  }>(sql`
    WITH current_period AS (
      SELECT
        COUNT(*) as flights,
        COALESCE(SUM(flight_time), 0) as hours,
        COUNT(DISTINCT user_id) as active_pilots
      FROM pireps
      WHERE status = 'approved'
        AND date >= ${currentStartTs}
        AND date <= ${currentEndTs}
    ),
    previous_period AS (
      SELECT
        COUNT(*) as flights,
        COALESCE(SUM(flight_time), 0) as hours,
        COUNT(DISTINCT user_id) as active_pilots
      FROM pireps
      WHERE status = 'approved'
        AND date >= ${previousStartTs}
        AND date <= ${previousEndTs}
    ),
    user_counts AS (
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at >= ${currentStartTs} AND created_at <= ${currentEndTs} THEN 1 END) as current_new_pilots,
        COUNT(CASE WHEN created_at >= ${previousStartTs} AND created_at <= ${previousEndTs} THEN 1 END) as previous_new_pilots
      FROM users
    )
    SELECT
      cp.flights as current_flights,
      cp.hours as current_hours,
      cp.active_pilots as current_active_pilots,
      uc.current_new_pilots,
      
      pp.flights as previous_flights,
      pp.hours as previous_hours,
      pp.active_pilots as previous_active_pilots,
      uc.previous_new_pilots,
      
      uc.total_users,
      CASE WHEN uc.total_users > 0 THEN (cp.active_pilots * 100.0 / uc.total_users) ELSE 0 END as current_active_rate,
      CASE WHEN uc.total_users > 0 THEN (pp.active_pilots * 100.0 / uc.total_users) ELSE 0 END as previous_active_rate
    FROM current_period cp, previous_period pp, user_counts uc;
  `);

  return result;
}

async function getOptimizedDailyStats(
  startDate: Date,
  endDate: Date
): Promise<TimeSeriesDataPoint[]> {
  const startTs = toTimestamp(startDate);
  const daysDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / MS_PER_DAY
  );

  // Generate all dates in JavaScript first, then query for each
  const results: TimeSeriesDataPoint[] = [];
  const baseUserCount = await db.get<{ count: number }>(sql`
    SELECT COUNT(*) as count FROM users WHERE created_at < ${startTs}
  `);

  for (let i = 0; i < daysDiff; i++) {
    const dayStart = startTs + i * 86400;
    const dayEnd = dayStart + 86400;
    const dateStr = new Date(dayStart * 1000).toISOString().split('T')[0];

    // Get flights for this day
    const dayFlights = await db.get<{
      daily_pireps: number;
      daily_flight_time: number;
      daily_career_flight_time: number;
      daily_active_pilots: number;
    }>(sql`
      SELECT
        COUNT(*) as daily_pireps,
        COALESCE(SUM(flight_time), 0) as daily_flight_time,
        COALESCE(SUM(CASE WHEN category = 'career' THEN flight_time ELSE 0 END), 0) as daily_career_flight_time,
        COUNT(DISTINCT user_id) as daily_active_pilots
      FROM pireps
      WHERE status = 'approved'
        AND date >= ${dayStart}
        AND date < ${dayEnd}
    `);

    // Get new users for this day
    const dayUsers = await db.get<{ daily_new_pilots: number }>(sql`
      SELECT COUNT(*) as daily_new_pilots
      FROM users
      WHERE created_at >= ${dayStart}
        AND created_at < ${dayEnd}
    `);

    // Calculate cumulative users up to this day
    const cumulativeUsers = await db.get<{ total: number }>(sql`
      SELECT COUNT(*) as total
      FROM users
      WHERE created_at <= ${dayEnd}
    `);

    results.push({
      date: dateStr,
      totalPireps: dayFlights?.daily_pireps || 0,
      totalFlightTime: dayFlights?.daily_flight_time || 0,
      careerFlightTime: dayFlights?.daily_career_flight_time || 0,
      activePilots: dayFlights?.daily_active_pilots || 0,
      newPilots: dayUsers?.daily_new_pilots || 0,
      totalUsers: cumulativeUsers?.total || baseUserCount?.count || 0,
    });
  }

  return results;
}

export async function getStats(fromDate?: Date): Promise<Stats> {
  const where = fromDate
    ? sql`WHERE p.status = 'approved' AND p.date >= ${toTimestamp(fromDate)}`
    : sql`WHERE p.status = 'approved'`;

  const row = await db.get<{
    totalPireps: number | null;
    totalFlightTime: number | null;
    totalPilots: number | null;
  }>(sql`
    SELECT
      COUNT(*) AS totalPireps,
      COALESCE(SUM(flight_time), 0) AS totalFlightTime,
      COUNT(DISTINCT user_id) AS totalPilots
    FROM pireps p
    ${where};
  `);

  return {
    totalPireps: row?.totalPireps ?? 0,
    totalFlightTime: row?.totalFlightTime ?? 0,
    totalPilots: row?.totalPilots ?? 0,
  };
}

export function getPeriodDates(
  period: TimePeriod,
  customDays?: number
): PeriodDates {
  const now = new Date();

  switch (period) {
    case '7d':
      return createDateRange(7, now);
    case '30d':
      return createDateRange(30, now);
    case '90d':
      return createDateRange(90, now);
    case 'custom':
      return createDateRange(customDays || 30, now);
    case 'all': {
      const startOfPreviousMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );
      const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      return {
        startDate: new Date('2020-01-01'),
        endDate: now,
        previousStartDate: startOfPreviousMonth,
        previousEndDate: endOfPreviousMonth,
      };
    }
    default:
      return createDateRange(7, now);
  }
}

export async function getDailyStats(
  startDate: Date,
  endDate: Date
): Promise<TimeSeriesDataPoint[]> {
  return getOptimizedDailyStats(startDate, endDate);
}

export async function getTotalPilotsInPeriod(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const result = await db.get<{ count: number }>(sql`
    SELECT COUNT(*) as count FROM users 
    WHERE created_at >= ${toTimestamp(startDate)} AND created_at <= ${toTimestamp(endDate)}
  `);
  return result?.count || 0;
}

export async function getActivePilotRate(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const result = await db.get<{ rate: number }>(sql`
    WITH active_count AS (
      SELECT COUNT(DISTINCT user_id) as active
      FROM pireps 
      WHERE status = 'approved' 
        AND date >= ${toTimestamp(startDate)} 
        AND date <= ${toTimestamp(endDate)}
    ),
    total_count AS (
      SELECT COUNT(*) as total FROM users
    )
    SELECT 
      CASE WHEN tc.total > 0 
        THEN MIN(100.0, (ac.active * 100.0 / tc.total))
        ELSE 0 
      END as rate
    FROM active_count ac, total_count tc;
  `);
  return result?.rate || 0;
}

export function generateSparklineData(
  timeSeries: TimeSeriesDataPoint[],
  currentValue: number,
  changePercentage: number,
  metric: 'flights' | 'hours' | 'pilots' | 'rate' | 'newPilots'
): SparklineData {
  const dataExtractors = {
    flights: (d: TimeSeriesDataPoint) => d.totalPireps,
    hours: (d: TimeSeriesDataPoint) => d.totalFlightTime,
    pilots: (d: TimeSeriesDataPoint) => d.totalUsers,
    newPilots: (d: TimeSeriesDataPoint) => d.newPilots,
    rate: (d: TimeSeriesDataPoint) =>
      d.totalUsers > 0
        ? Math.min((d.activePilots / d.totalUsers) * 100, 100)
        : 0,
  };

  return {
    value: currentValue,
    change: changePercentage,
    trend:
      changePercentage > 0.1
        ? 'up'
        : changePercentage < -0.1
          ? 'down'
          : 'stable',
    data: timeSeries.map(dataExtractors[metric]),
  };
}

export async function getStatistics(
  period: TimePeriod,
  customDays?: number
): Promise<StatisticsData> {
  const { startDate, endDate, previousStartDate, previousEndDate } =
    getPeriodDates(period, customDays);

  const [statsData, currentTimeSeries] = await Promise.all([
    getAllStatisticsData(
      startDate,
      endDate,
      previousStartDate,
      previousEndDate
    ),
    getOptimizedDailyStats(startDate, endDate),
  ]);

  if (!statsData) {
    throw new Error('Failed to load statistics data');
  }

  const pct = (cur: number, prev: number) =>
    Math.round(calculateChange(cur, prev).percentage);

  const sparklines = {
    totalPilots: generateSparklineData(
      currentTimeSeries,
      statsData.current_new_pilots,
      pct(statsData.current_new_pilots, statsData.previous_new_pilots),
      'newPilots'
    ),
    totalFlights: generateSparklineData(
      currentTimeSeries,
      statsData.current_flights,
      pct(statsData.current_flights, statsData.previous_flights),
      'flights'
    ),
    totalFlightHours: generateSparklineData(
      currentTimeSeries,
      statsData.current_hours,
      pct(statsData.current_hours, statsData.previous_hours),
      'hours'
    ),
    activePilotRate: generateSparklineData(
      currentTimeSeries,
      statsData.current_active_rate,
      pct(statsData.current_active_rate, statsData.previous_active_rate),
      'rate'
    ),
  };

  return {
    totalPilots: statsData.current_new_pilots,
    totalFlights: statsData.current_flights,
    totalFlightHours: statsData.current_hours,
    activePilotRate: statsData.current_active_rate,
    sparklines,
    timeSeries: currentTimeSeries,
  };
}

async function getAllTabStatistics(startDate: Date, endDate: Date) {
  const startTs = toTimestamp(startDate);
  const endTs = toTimestamp(endDate);
  const now = Math.floor(Date.now() / 1000);
  const daysDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / MS_PER_DAY
  );

  const result = await db.all(sql`
    WITH period_stats AS (
      SELECT
        COUNT(*) as total_flights,
        COALESCE(SUM(flight_time), 0) as total_hours,
        COUNT(DISTINCT user_id) as active_pilots,
        CAST(COUNT(*) AS FLOAT) / ${daysDiff} as avg_flights_per_day,
        CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(flight_time), 0) / COUNT(*) ELSE 0 END as avg_hours_per_flight
      FROM pireps
      WHERE status = 'approved'
        AND date >= ${startTs}
        AND date <= ${endTs}
    ),
    user_stats AS (
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at >= ${startTs} AND created_at <= ${endTs} THEN 1 END) as new_pilots
      FROM users
    ),
    hours_distribution AS (
      SELECT
        SUM(CASE WHEN flight_time < 1 THEN 1 ELSE 0 END) as under_1hr,
        SUM(CASE WHEN flight_time >= 1 AND flight_time < 2 THEN 1 ELSE 0 END) as hr_1_2,
        SUM(CASE WHEN flight_time >= 2 AND flight_time < 4 THEN 1 ELSE 0 END) as hr_2_4,
        SUM(CASE WHEN flight_time >= 4 AND flight_time < 8 THEN 1 ELSE 0 END) as hr_4_8,
        SUM(CASE WHEN flight_time >= 8 THEN 1 ELSE 0 END) as hr_8_plus
      FROM pireps
      WHERE status = 'approved'
        AND date >= ${startTs}
        AND date <= ${endTs}
    ),
    activity_breakdown AS (
      SELECT
        SUM(CASE WHEN (${now} - max_date) <= 7 * 24 * 60 * 60 THEN 1 ELSE 0 END) as active_1_7_days,
        SUM(CASE WHEN (${now} - max_date) > 7 * 24 * 60 * 60 AND (${now} - max_date) <= 30 * 24 * 60 * 60 THEN 1 ELSE 0 END) as active_8_30_days,
        SUM(CASE WHEN (${now} - max_date) > 30 * 24 * 60 * 60 AND (${now} - max_date) <= 90 * 24 * 60 * 60 THEN 1 ELSE 0 END) as active_31_90_days,
        SUM(CASE WHEN (${now} - max_date) > 90 * 24 * 60 * 60 THEN 1 ELSE 0 END) as active_90_plus_days
      FROM (
        SELECT user_id, MAX(date) as max_date
        FROM pireps
        WHERE status = 'approved'
        GROUP BY user_id
        HAVING MAX(date) >= ${startTs}
      )
    )
    SELECT
      ps.*,
      us.*,
      hd.*,
      ab.*
    FROM period_stats ps, user_stats us, hours_distribution hd, activity_breakdown ab;
  `);

  return result;
}

export async function getPilotStatistics(
  startDate: Date,
  endDate: Date
): Promise<PilotStatistics> {
  const [tabData, registrationTrend] = await Promise.all([
    getAllTabStatistics(startDate, endDate),
    getOptimizedDailyStats(startDate, endDate),
  ]);

  const data = tabData[0] as {
    total_users: number;
    active_pilots: number;
    new_pilots: number;
  };
  const inactiveCount = Math.max(0, data.total_users - data.active_pilots);

  return {
    totalRegistered: data.new_pilots,
    activeThisPeriod: data.active_pilots,
    inactiveCount,
    activityRate:
      data.total_users > 0 ? (data.active_pilots / data.total_users) * 100 : 0,
    registrationTrend,
  };
}

export async function getFlightStatistics(
  startDate: Date,
  endDate: Date
): Promise<FlightStatistics> {
  const [tabData, dailyTrend] = await Promise.all([
    getAllTabStatistics(startDate, endDate),
    getOptimizedDailyStats(startDate, endDate),
  ]);

  const data = tabData[0] as {
    total_flights: number;
    avg_flights_per_day: number;
  };

  return {
    totalFlights: data.total_flights,
    averagePerDay: Math.round(data.avg_flights_per_day * 100) / 100,
    dailyTrend,
  };
}

export async function getFlightHoursStatistics(
  startDate: Date,
  endDate: Date
): Promise<FlightHoursStatistics> {
  const [tabData, hoursTrend] = await Promise.all([
    getAllTabStatistics(startDate, endDate),
    getOptimizedDailyStats(startDate, endDate),
  ]);

  const data = tabData[0] as {
    total_hours: number;
    avg_hours_per_flight: number;
    active_pilots: number;
    total_flights: number;
    under_1hr: number;
    hr_1_2: number;
    hr_2_4: number;
    hr_4_8: number;
    hr_8_plus: number;
  };

  const hoursDistribution = [
    {
      range: '< 1 hour',
      count: data.under_1hr,
      percentage:
        data.total_flights > 0
          ? Math.round((data.under_1hr / data.total_flights) * 100)
          : 0,
    },
    {
      range: '1-2 hours',
      count: data.hr_1_2,
      percentage:
        data.total_flights > 0
          ? Math.round((data.hr_1_2 / data.total_flights) * 100)
          : 0,
    },
    {
      range: '2-4 hours',
      count: data.hr_2_4,
      percentage:
        data.total_flights > 0
          ? Math.round((data.hr_2_4 / data.total_flights) * 100)
          : 0,
    },
    {
      range: '4-8 hours',
      count: data.hr_4_8,
      percentage:
        data.total_flights > 0
          ? Math.round((data.hr_4_8 / data.total_flights) * 100)
          : 0,
    },
    {
      range: '8+ hours',
      count: data.hr_8_plus,
      percentage:
        data.total_flights > 0
          ? Math.round((data.hr_8_plus / data.total_flights) * 100)
          : 0,
    },
  ];

  return {
    totalHours: data.total_hours,
    averageHoursPerFlight: Math.round(data.avg_hours_per_flight * 100) / 100,
    averageHoursPerPilot:
      data.active_pilots > 0
        ? Math.round((data.total_hours / data.active_pilots) * 100) / 100
        : 0,
    hoursDistribution,
    hoursTrend,
  };
}

export async function getActivePilotStatistics(
  startDate: Date,
  endDate: Date
): Promise<ActivePilotStatistics> {
  const tabData = await getAllTabStatistics(startDate, endDate);
  const data = tabData[0] as {
    active_1_7_days: number;
    active_8_30_days: number;
    active_31_90_days: number;
    active_90_plus_days: number;
    active_pilots: number;
    total_users: number;
  };

  const activityBreakdown = [
    {
      range: '1-7 days',
      count: data.active_1_7_days,
      percentage:
        data.active_pilots > 0
          ? Math.round((data.active_1_7_days / data.active_pilots) * 100)
          : 0,
    },
    {
      range: '8-30 days',
      count: data.active_8_30_days,
      percentage:
        data.active_pilots > 0
          ? Math.round((data.active_8_30_days / data.active_pilots) * 100)
          : 0,
    },
    {
      range: '31-90 days',
      count: data.active_31_90_days,
      percentage:
        data.active_pilots > 0
          ? Math.round((data.active_31_90_days / data.active_pilots) * 100)
          : 0,
    },
    {
      range: '90+ days',
      count: data.active_90_plus_days,
      percentage:
        data.active_pilots > 0
          ? Math.round((data.active_90_plus_days / data.active_pilots) * 100)
          : 0,
    },
  ];

  // Monthly activity still needs separate query (but only 1)
  const monthlyActivity = (await db.all(sql`
    WITH monthly_stats AS (
      SELECT
        strftime('%Y-%m', datetime(date, 'unixepoch')) as month,
        COUNT(DISTINCT user_id) as activePilots
      FROM pireps
      WHERE status = 'approved'
        AND date >= strftime('%s', 'now', '-6 months')
      GROUP BY strftime('%Y-%m', datetime(date, 'unixepoch'))
    )
    SELECT
      ms.month,
      ms.activePilots,
      ${data.total_users} as totalPilots,
      CASE WHEN ${data.total_users} > 0 THEN CAST(ms.activePilots * 100.0 / ${data.total_users} AS INTEGER) ELSE 0 END as rate
    FROM monthly_stats ms
    ORDER BY ms.month DESC
    LIMIT 6
  `)) as Array<{
    month: string;
    activePilots: number;
    totalPilots: number;
    rate: number;
  }>;

  // Get daily trend for the selected period (matches other tabs)
  const dailyTrend = await getOptimizedDailyStats(startDate, endDate);

  return {
    currentActiveCount: data.active_pilots,
    activityRate:
      data.total_users > 0
        ? Math.round((data.active_pilots / data.total_users) * 100)
        : 0,
    activityThreshold: 30,
    activityBreakdown,
    monthlyActivity,
    dailyTrend,
  };
}

export async function getTabStatistics(
  startDate: Date,
  endDate: Date
): Promise<TabStatistics> {
  const [pilots, flights, flightHours, activePilots] = await Promise.all([
    getPilotStatistics(startDate, endDate),
    getFlightStatistics(startDate, endDate),
    getFlightHoursStatistics(startDate, endDate),
    getActivePilotStatistics(startDate, endDate),
  ]);

  return { pilots, flights, flightHours, activePilots };
}

export async function getStatisticsTabsData(
  period: TimePeriod,
  customDays?: number
): Promise<StatisticsTabsData> {
  const { startDate, endDate } = getPeriodDates(period, customDays);

  const [baseStats, tabStats] = await Promise.all([
    getStatistics(period, customDays),
    getTabStatistics(startDate, endDate),
  ]);

  return {
    ...baseStats,
    tabs: tabStats,
  };
}
