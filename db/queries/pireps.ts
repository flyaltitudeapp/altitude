import { desc, eq, inArray, SQL, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  type Aircraft,
  aircraft,
  type Multiplier,
  multipliers,
  type Pirep,
  pirepEvents,
  pireps,
  type User,
  users,
} from '@/db/schema';

export interface PaginatedPirepResult {
  pireps: Pirep[];
  total: number;
}

import type { FilterCondition, FilterOperator } from '@/types/database';

export type PirepFilterField =
  | 'flightNumber'
  | 'departureIcao'
  | 'arrivalIcao'
  | 'aircraftId'
  | 'flightTime'
  | 'cargo'
  | 'fuelBurned'
  | 'status'
  | 'category'
  | 'date';

export interface PirepFilterCondition extends FilterCondition {
  field: PirepFilterField;
  operator: FilterOperator;
}

async function getTotalFlightsNumber(
  userId: string
): Promise<{ totalFlights: number }> {
  const row = await db
    .select({
      totalFlights: sql<number>`COUNT(*)`.as('totalFlights'),
    })
    .from(pireps)
    .where(eq(pireps.userId, userId))
    .get();

  return { totalFlights: row?.totalFlights ?? 0 };
}

async function getCareerPirepCountForUser(
  userId: string
): Promise<{ careerFlights: number }> {
  const row = await db
    .select({
      careerFlights:
        sql<number>`COUNT(CASE WHEN ${pireps.category} = 'career' THEN 1 END)`.as(
          'careerFlights'
        ),
    })
    .from(pireps)
    .where(eq(pireps.userId, userId))
    .get();

  return { careerFlights: row?.careerFlights ?? 0 };
}

async function getUserLastFlights(userId: string): Promise<Pirep[]> {
  return db
    .select()
    .from(pireps)
    .where(eq(pireps.userId, userId))
    .orderBy(desc(pireps.date))
    .limit(5);
}

async function getUserPireps(
  userId: string,
  page: number,
  limit: number
): Promise<{ pireps: Pirep[]; total: number }> {
  const offset = (page - 1) * limit;

  const rows = await db
    .select({
      pirep: pireps,
      totalCount: sql<number>`COUNT(*) OVER()`.as('totalCount'),
    })
    .from(pireps)
    .where(eq(pireps.userId, userId))
    .orderBy(desc(pireps.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    pireps: rows.map((r) => r.pirep),
    total: rows[0]?.totalCount ?? 0,
  };
}

async function getPirepById(pirepId: string): Promise<{
  pirep: Pirep;
  aircraft: Aircraft | null;
  multiplier: Multiplier | null;
  user: User;
} | null> {
  const row = await db
    .select({
      pirep: pireps,
      aircraft: aircraft,
      multiplier: multipliers,
      user: users,
    })
    .from(pireps)
    .leftJoin(aircraft, eq(pireps.aircraftId, aircraft.id))
    .leftJoin(multipliers, eq(pireps.multiplierId, multipliers.id))
    .innerJoin(users, eq(pireps.userId, users.id))
    .where(eq(pireps.id, pirepId))
    .get();

  if (!row) {
    return null;
  }

  return {
    pirep: row.pirep,
    aircraft: row.aircraft,
    multiplier: row.multiplier,
    user: row.user,
  };
}

async function countPirepsByAircraft(aircraftId: string): Promise<number> {
  const row = await db
    .select({ count: sql<number>`COUNT(*)`.as('count') })
    .from(pireps)
    .where(eq(pireps.aircraftId, aircraftId))
    .get();

  return row?.count ?? 0;
}

async function getPirepsPaginated(
  page: number,
  limit: number,
  status: 'pending' | 'approved' | 'denied'
): Promise<{ pireps: (Pirep & { user: User })[]; total: number }> {
  const offset = (page - 1) * limit;

  const rows = await db
    .select({
      pirep: pireps,
      user: users,
      totalCount: sql<number>`COUNT(*) OVER()`.as('totalCount'),
    })
    .from(pireps)
    .innerJoin(users, eq(pireps.userId, users.id))
    .where(eq(pireps.status, status))
    .orderBy(desc(pireps.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    pireps: rows.map((r) => ({ ...r.pirep, user: r.user })),
    total: rows[0]?.totalCount ?? 0,
  };
}

async function getPirepsByStatusWithUsers(
  status: 'pending' | 'approved' | 'denied'
): Promise<(Pirep & { user: User })[]> {
  const rows = await db
    .select({
      pirep: pireps,
      user: users,
    })
    .from(pireps)
    .innerJoin(users, eq(pireps.userId, users.id))
    .where(eq(pireps.status, status))
    .orderBy(desc(pireps.createdAt));

  return rows.map((r) => ({ ...r.pirep, user: r.user }));
}

const buildStringCondition = (
  field:
    | typeof pireps.flightNumber
    | typeof pireps.departureIcao
    | typeof pireps.arrivalIcao
    | typeof pireps.status
    | typeof pireps.category,
  operator: FilterOperator,
  value: string | number | undefined
): SQL<boolean> => {
  const stringValue = String(value || '');

  switch (operator) {
    case 'contains':
      return sql<boolean>`upper(${field}) LIKE upper(${`%${stringValue}%`})`;
    case 'is':
      return sql<boolean>`upper(${field}) = upper(${stringValue})`;
    case 'is_not':
      return sql<boolean>`upper(${field}) != upper(${stringValue})`;
    case 'starts_with':
      return sql<boolean>`upper(${field}) LIKE upper(${`${stringValue}%`})`;
    case 'ends_with':
      return sql<boolean>`upper(${field}) LIKE upper(${`%${stringValue}`})`;
    default:
      return sql<boolean>`1 = 1`;
  }
};

const buildNumberCondition = (
  field:
    | typeof pireps.flightTime
    | typeof pireps.cargo
    | typeof pireps.fuelBurned,
  operator: FilterOperator,
  value: string | number | undefined
): SQL<boolean> => {
  const numericValue = Number(value || 0);

  switch (operator) {
    case 'is':
      return sql<boolean>`${field} = ${numericValue}`;
    case 'is_not':
      return sql<boolean>`${field} != ${numericValue}`;
    case 'greater_than':
      return sql<boolean>`${field} > ${numericValue}`;
    case 'less_than':
      return sql<boolean>`${field} < ${numericValue}`;
    case 'greater_equal':
      return sql<boolean>`${field} >= ${numericValue}`;
    case 'less_equal':
      return sql<boolean>`${field} <= ${numericValue}`;
    default:
      return sql<boolean>`1 = 1`;
  }
};

const buildDateCondition = (
  operator: FilterOperator,
  value: string | number | undefined
): SQL<boolean> => {
  if (!value) {
    return sql<boolean>`1 = 1`;
  }

  const dateValue = new Date(value);
  const timestamp = Math.floor(dateValue.getTime() / 1000);

  switch (operator) {
    case 'is': {
      // For date equality, check if the date falls within the same day
      const startOfDay = Math.floor(
        new Date(dateValue.setHours(0, 0, 0, 0)).getTime() / 1000
      );
      const endOfDay = Math.floor(
        new Date(dateValue.setHours(23, 59, 59, 999)).getTime() / 1000
      );
      return sql<boolean>`${pireps.date} >= ${startOfDay} AND ${pireps.date} <= ${endOfDay}`;
    }
    case 'before':
      return sql<boolean>`${pireps.date} < ${timestamp}`;
    case 'after':
      return sql<boolean>`${pireps.date} > ${timestamp}`;
    default:
      return sql<boolean>`1 = 1`;
  }
};

const buildFieldCondition = (condition: PirepFilterCondition): SQL<boolean> => {
  const { field, operator, value } = condition;

  switch (field) {
    case 'flightNumber':
      return buildStringCondition(pireps.flightNumber, operator, value);
    case 'departureIcao':
      return buildStringCondition(pireps.departureIcao, operator, value);
    case 'arrivalIcao':
      return buildStringCondition(pireps.arrivalIcao, operator, value);
    case 'status':
      return buildStringCondition(pireps.status, operator, value);
    case 'category':
      return buildStringCondition(pireps.category, operator, value);
    case 'aircraftId':
      return sql<boolean>`${pireps.aircraftId} = ${String(value || '')}`;
    case 'flightTime':
      return buildNumberCondition(pireps.flightTime, operator, value);
    case 'cargo':
      return buildNumberCondition(pireps.cargo, operator, value);
    case 'fuelBurned':
      return buildNumberCondition(pireps.fuelBurned, operator, value);
    case 'date':
      return buildDateCondition(operator, value);
    default:
      return sql<boolean>`1 = 1`;
  }
};

const combineConditions = (conditions: SQL<boolean>[]): SQL<boolean> => {
  return conditions.length > 0
    ? conditions.reduce((prev, curr) => sql<boolean>`(${prev}) AND (${curr})`)
    : sql<boolean>`1 = 1`;
};

async function getUserPirepsFiltered(
  userId: string,
  filters: PirepFilterCondition[],
  page: number,
  limit: number
): Promise<PaginatedPirepResult> {
  const offset = (page - 1) * limit;

  const filterConditions = filters.map(buildFieldCondition);
  const userCondition = sql<boolean>`${pireps.userId} = ${userId}`;
  const allConditions = [userCondition, ...filterConditions];
  const combinedCondition = combineConditions(allConditions);

  const rows = await db
    .select({
      pirep: pireps,
      totalCount: sql<number>`COUNT(*) OVER()`.as('totalCount'),
    })
    .from(pireps)
    .where(combinedCondition)
    .orderBy(desc(pireps.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    pireps: rows.map((r) => r.pirep),
    total: rows[0]?.totalCount ?? 0,
  };
}

// PIREP EVENTS QUERIES

/**
 * Records an event in pirep_events.
 *
 * A null `performedBy` means the system performed the action rather than a
 * user, as with automated approvals.
 */
export async function logPirepEvent(
  pirepId: string,
  action: string,
  performedBy: string | null,
  details?: string | null,
  previousValues?: Record<string, unknown> | null,
  newValues?: Record<string, unknown> | null
): Promise<void> {
  await db.insert(pirepEvents).values({
    id: crypto.randomUUID(),
    pirepId,
    action,
    performedBy,
    details: details ?? null,
    previousValues: previousValues ? JSON.stringify(previousValues) : null,
    newValues: newValues ? JSON.stringify(newValues) : null,
    createdAt: new Date(),
  });
}

export async function getPirepEventsWithAirline(pirepId: string) {
  const { getAirline } = await import('./airline');

  const airline = await getAirline();
  const events = await db
    .select({
      id: pirepEvents.id,
      action: pirepEvents.action,
      details: pirepEvents.details,
      previousValues: pirepEvents.previousValues,
      newValues: pirepEvents.newValues,
      timestamp: pirepEvents.createdAt,
      userId: users.id,
      userName: users.name,
      userCallsign: users.callsign,
      userImage: users.image,
    })
    .from(pirepEvents)
    .leftJoin(users, eq(users.id, pirepEvents.performedBy))
    .where(eq(pirepEvents.pirepId, pirepId))
    .orderBy(desc(pirepEvents.createdAt));

  return {
    events,
    airlineCallsign: airline?.callsign || '',
  };
}

async function resolveAircraftNames(
  aircraftIds: string[]
): Promise<Record<string, string>> {
  if (aircraftIds.length === 0) {
    return {};
  }

  const aircraftData = await db
    .select({
      id: aircraft.id,
      name: aircraft.name,
      livery: aircraft.livery,
    })
    .from(aircraft)
    .where(inArray(aircraft.id, aircraftIds));

  const result: Record<string, string> = {};
  for (const ac of aircraftData) {
    result[ac.id] = `${ac.name} (${ac.livery})`;
  }
  return result;
}

async function resolveMultiplierNames(
  multiplierIds: string[]
): Promise<Record<string, string>> {
  if (multiplierIds.length === 0) {
    return {};
  }

  const multiplierData = await db
    .select({
      id: multipliers.id,
      name: multipliers.name,
      value: multipliers.value,
    })
    .from(multipliers)
    .where(inArray(multipliers.id, multiplierIds));

  const result: Record<string, string> = {};
  for (const mult of multiplierData) {
    result[mult.id] = `${mult.name} (x${mult.value})`;
  }
  return result;
}

export {
  countPirepsByAircraft,
  getCareerPirepCountForUser,
  getPirepById,
  getPirepsByStatusWithUsers,
  getPirepsPaginated,
  getTotalFlightsNumber,
  getUserLastFlights,
  getUserPireps,
  getUserPirepsFiltered,
  resolveAircraftNames,
  resolveMultiplierNames,
};
