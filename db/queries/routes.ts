import { desc, eq, inArray, SQL, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  aircraft,
  type Route,
  routeAircraft,
  routes,
  routesFlightNumbers,
} from '@/db/schema';

export type RouteWithNumbers = Route & {
  flightNumbers: string[];
  aircraftIds: string[];
};

export interface PaginatedResult<T> {
  routes: T[];
  total: number;
}

import type { FilterCondition, FilterOperator } from '@/types/database';

export type FilterField =
  | 'flightNumber'
  | 'departureIcao'
  | 'arrivalIcao'
  | 'aircraftId'
  | 'flightTime'
  | 'airline';

export interface RouteFilterCondition extends FilterCondition {
  field: FilterField;
  operator: FilterOperator;
}

type RouteRow = {
  id: string;
  departureIcao: string;
  arrivalIcao: string;
  flightTime: number | null;
  details: string | null;
  createdAt: Date;
  updatedAt: Date;
  flightNumbers: string;
  aircraftIds: string;
};

const routeSelectFields = {
  id: routes.id,
  departureIcao: routes.departureIcao,
  arrivalIcao: routes.arrivalIcao,
  flightTime: routes.flightTime,
  details: routes.details,
  createdAt: routes.createdAt,
  updatedAt: routes.updatedAt,
  flightNumbers: sql<string>`COALESCE(GROUP_CONCAT(DISTINCT ${routesFlightNumbers.flightNumber}), '')`,
  aircraftIds: sql<string>`COALESCE(GROUP_CONCAT(DISTINCT ${routeAircraft.aircraftId}), '')`,
};

const transformRouteResult = (row: RouteRow): RouteWithNumbers => ({
  id: row.id,
  departureIcao: row.departureIcao,
  arrivalIcao: row.arrivalIcao,
  flightTime: row.flightTime ?? 0,
  details: row.details,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  flightNumbers: row.flightNumbers
    ? row.flightNumbers.split(',').filter(Boolean)
    : [],
  aircraftIds: row.aircraftIds
    ? row.aircraftIds.split(',').filter(Boolean)
    : [],
});

const createFlightNumberSubquery = (condition: SQL<boolean>): SQL<boolean> =>
  sql<boolean>`${routes.id} IN (SELECT ${routesFlightNumbers.routeId} FROM ${routesFlightNumbers} WHERE ${condition})`;

const createAircraftSubquery = (condition: SQL<boolean>): SQL<boolean> =>
  sql<boolean>`${routes.id} IN (SELECT ${routeAircraft.routeId} FROM ${routeAircraft} WHERE ${condition})`;

const createAircraftWithLiverySubquery = (
  condition: SQL<boolean>
): SQL<boolean> =>
  sql<boolean>`${routes.id} IN (
    SELECT ${routeAircraft.routeId}
    FROM ${routeAircraft}
    JOIN ${aircraft} ON ${routeAircraft.aircraftId} = ${aircraft.id}
    WHERE ${condition}
  )`;

const createAircraftWithLiveryNotSubquery = (
  condition: SQL<boolean>
): SQL<boolean> =>
  sql<boolean>`${routes.id} NOT IN (
    SELECT ${routeAircraft.routeId}
    FROM ${routeAircraft}
    JOIN ${aircraft} ON ${routeAircraft.aircraftId} = ${aircraft.id}
    WHERE ${condition}
  )`;

const buildStringCondition = (
  field: typeof routes.departureIcao | typeof routes.arrivalIcao,
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

const buildFlightNumberCondition = (
  operator: FilterOperator,
  value: string | number | undefined
): SQL<boolean> => {
  const stringValue = String(value || '');

  switch (operator) {
    case 'contains':
      return createFlightNumberSubquery(
        sql<boolean>`upper(${routesFlightNumbers.flightNumber}) LIKE upper(${`%${stringValue}%`})`
      );
    case 'is':
      return createFlightNumberSubquery(
        sql<boolean>`upper(${routesFlightNumbers.flightNumber}) = upper(${stringValue})`
      );
    case 'is_not':
      return createFlightNumberSubquery(
        sql<boolean>`upper(${routesFlightNumbers.flightNumber}) != upper(${stringValue})`
      );
    case 'starts_with':
      return createFlightNumberSubquery(
        sql<boolean>`upper(${routesFlightNumbers.flightNumber}) LIKE upper(${`${stringValue}%`})`
      );
    case 'ends_with':
      return createFlightNumberSubquery(
        sql<boolean>`upper(${routesFlightNumbers.flightNumber}) LIKE upper(${`%${stringValue}`})`
      );
    default:
      return sql<boolean>`1 = 1`;
  }
};

const buildAircraftCondition = (
  operator: FilterOperator,
  value: string | number | undefined
): SQL<boolean> => {
  const stringValue = String(value || '');

  switch (operator) {
    case 'is':
      return createAircraftSubquery(
        sql<boolean>`${routeAircraft.aircraftId} = ${stringValue}`
      );
    case 'is_not':
      return createAircraftSubquery(
        sql<boolean>`${routeAircraft.aircraftId} != ${stringValue}`
      );
    default:
      return sql<boolean>`1 = 1`;
  }
};

const buildAirlineCondition = (
  operator: FilterOperator,
  value: string | number | undefined
): SQL<boolean> => {
  const stringValue = String(value || '');

  switch (operator) {
    case 'contains':
      return createAircraftWithLiverySubquery(
        sql<boolean>`${aircraft.livery} LIKE ${`%${stringValue}%`} COLLATE NOCASE`
      );
    case 'is':
      return createAircraftWithLiverySubquery(
        sql<boolean>`${aircraft.livery} = ${stringValue} COLLATE NOCASE`
      );
    case 'is_not':
      return createAircraftWithLiveryNotSubquery(
        sql<boolean>`${aircraft.livery} = ${stringValue} COLLATE NOCASE`
      );
    case 'starts_with':
      return createAircraftWithLiverySubquery(
        sql<boolean>`${aircraft.livery} LIKE ${`${stringValue}%`} COLLATE NOCASE`
      );
    case 'ends_with':
      return createAircraftWithLiverySubquery(
        sql<boolean>`${aircraft.livery} LIKE ${`%${stringValue}`} COLLATE NOCASE`
      );
    default:
      return sql<boolean>`1 = 1`;
  }
};

const buildFlightTimeCondition = (
  operator: FilterOperator,
  value: string | number | undefined
): SQL<boolean> => {
  const numericValue = Number(value || 0);

  switch (operator) {
    case 'is':
      return sql<boolean>`${routes.flightTime} = ${numericValue}`;
    case 'is_not':
      return sql<boolean>`${routes.flightTime} != ${numericValue}`;
    case 'greater_than':
      return sql<boolean>`${routes.flightTime} > ${numericValue}`;
    case 'less_than':
      return sql<boolean>`${routes.flightTime} < ${numericValue}`;
    case 'greater_equal':
      return sql<boolean>`${routes.flightTime} >= ${numericValue}`;
    case 'less_equal':
      return sql<boolean>`${routes.flightTime} <= ${numericValue}`;
    default:
      return sql<boolean>`1 = 1`;
  }
};

const buildFieldCondition = (condition: RouteFilterCondition): SQL<boolean> => {
  const { field, operator, value } = condition;

  switch (field) {
    case 'departureIcao':
      return buildStringCondition(routes.departureIcao, operator, value);
    case 'arrivalIcao':
      return buildStringCondition(routes.arrivalIcao, operator, value);
    case 'flightNumber':
      return buildFlightNumberCondition(operator, value);
    case 'aircraftId':
      return buildAircraftCondition(operator, value);
    case 'flightTime':
      return buildFlightTimeCondition(operator, value);
    case 'airline':
      return buildAirlineCondition(operator, value);
    default:
      return sql<boolean>`1 = 1`;
  }
};

const combineConditions = (conditions: SQL<boolean>[]): SQL<boolean> => {
  return conditions.length > 0
    ? conditions.reduce((prev, curr) => sql<boolean>`(${prev}) AND (${curr})`)
    : sql<boolean>`1 = 1`;
};

const combineOrConditions = (conditions: SQL<boolean>[]): SQL<boolean> => {
  return conditions.length > 0
    ? conditions.reduce((prev, curr) => sql<boolean>`(${prev}) OR (${curr})`)
    : sql<boolean>`1 = 1`;
};

const buildPaginatedQuery = (
  whereCondition: SQL<boolean>,
  page: number,
  limit: number
) => {
  const offset = (page - 1) * limit;

  return db
    .select({
      ...routeSelectFields,
      totalCount: sql<number>`COUNT(*) OVER()`.as('totalCount'),
    })
    .from(routes)
    .leftJoin(routesFlightNumbers, eq(routes.id, routesFlightNumbers.routeId))
    .leftJoin(routeAircraft, eq(routes.id, routeAircraft.routeId))
    .where(whereCondition)
    .groupBy(routes.id)
    .orderBy(desc(routes.createdAt))
    .limit(limit)
    .offset(offset);
};

async function getRouteById(id: string): Promise<RouteWithNumbers | null> {
  const result = await db
    .select(routeSelectFields)
    .from(routes)
    .leftJoin(routesFlightNumbers, eq(routes.id, routesFlightNumbers.routeId))
    .leftJoin(routeAircraft, eq(routes.id, routeAircraft.routeId))
    .where(eq(routes.id, id))
    .groupBy(routes.id)
    .get();

  return result ? transformRouteResult(result as RouteRow) : null;
}

/**
 * All routes published between two airports. Used by automated PIREP
 * verification, which has to consider every route on the pair before deciding
 * whether a filed flight number belongs to one of them.
 */
async function getRoutesByAirports(
  departureIcao: string,
  arrivalIcao: string
): Promise<RouteWithNumbers[]> {
  const result = await db
    .select(routeSelectFields)
    .from(routes)
    .leftJoin(routesFlightNumbers, eq(routes.id, routesFlightNumbers.routeId))
    .leftJoin(routeAircraft, eq(routes.id, routeAircraft.routeId))
    .where(
      sql<boolean>`UPPER(${routes.departureIcao}) = UPPER(${departureIcao}) AND UPPER(${routes.arrivalIcao}) = UPPER(${arrivalIcao})`
    )
    .groupBy(routes.id);

  return result.map((row) => transformRouteResult(row as RouteRow));
}

/**
 * Routes carrying a given flight number, regardless of airport pair. Lets
 * verification tell "this flight number does not exist" apart from "this
 * flight number belongs to a different route".
 */
async function getRoutesByFlightNumber(
  flightNumber: string
): Promise<RouteWithNumbers[]> {
  const matchingRouteIds = await db
    .selectDistinct({ routeId: routesFlightNumbers.routeId })
    .from(routesFlightNumbers)
    .where(
      sql<boolean>`UPPER(${routesFlightNumbers.flightNumber}) = UPPER(${flightNumber})`
    );

  if (matchingRouteIds.length === 0) {
    return [];
  }

  const result = await db
    .select(routeSelectFields)
    .from(routes)
    .leftJoin(routesFlightNumbers, eq(routes.id, routesFlightNumbers.routeId))
    .leftJoin(routeAircraft, eq(routes.id, routeAircraft.routeId))
    .where(
      inArray(
        routes.id,
        matchingRouteIds.map((row) => row.routeId)
      )
    )
    .groupBy(routes.id);

  return result.map((row) => transformRouteResult(row as RouteRow));
}

async function getRoutesPaginated(
  page: number,
  limit: number
): Promise<PaginatedResult<RouteWithNumbers>> {
  const result = await buildPaginatedQuery(sql<boolean>`1 = 1`, page, limit);

  return {
    routes: result.map(({ ...route }) =>
      transformRouteResult(route as RouteRow)
    ),
    total: result[0]?.totalCount ?? 0,
  };
}

async function filterRoutesAdvanced(
  filters: RouteFilterCondition[],
  page: number,
  limit: number
): Promise<PaginatedResult<RouteWithNumbers>> {
  const airlineIsValues: string[] = [];
  const airlineIsNotValues: string[] = [];

  const otherFilters: RouteFilterCondition[] = [];
  for (const f of filters) {
    if (f.field === 'airline' && f.value !== undefined && f.value !== '') {
      const v = String(f.value);
      if (f.operator === 'is') {
        airlineIsValues.push(v);
      } else if (f.operator === 'is_not') {
        airlineIsNotValues.push(v);
      } else {
        otherFilters.push(f);
      }
    } else {
      otherFilters.push(f);
    }
  }

  const conditions: SQL<boolean>[] = otherFilters.map(buildFieldCondition);

  if (airlineIsValues.length > 0) {
    const uniq = Array.from(new Set(airlineIsValues));
    const orConds = uniq.map(
      (v) => sql<boolean>`${aircraft.livery} = ${v} COLLATE NOCASE`
    );
    conditions.push(
      createAircraftWithLiverySubquery(combineOrConditions(orConds))
    );
  }

  if (airlineIsNotValues.length > 0) {
    const uniq = Array.from(new Set(airlineIsNotValues));
    const orConds = uniq.map(
      (v) => sql<boolean>`${aircraft.livery} = ${v} COLLATE NOCASE`
    );
    conditions.push(
      createAircraftWithLiveryNotSubquery(combineOrConditions(orConds))
    );
  }
  const combinedCondition = combineConditions(conditions);

  const result = await buildPaginatedQuery(combinedCondition, page, limit);

  return {
    routes: result.map(({ ...route }) =>
      transformRouteResult(route as RouteRow)
    ),
    total: result[0]?.totalCount ?? 0,
  };
}

async function findRouteIdsByFilters(
  filters: RouteFilterCondition[]
): Promise<string[]> {
  const airlineIsValues: string[] = [];
  const airlineIsNotValues: string[] = [];

  const otherFilters: RouteFilterCondition[] = [];
  for (const f of filters) {
    if (f.field === 'airline' && f.value !== undefined && f.value !== '') {
      const v = String(f.value);
      if (f.operator === 'is') {
        airlineIsValues.push(v);
      } else if (f.operator === 'is_not') {
        airlineIsNotValues.push(v);
      } else {
        otherFilters.push(f);
      }
    } else {
      otherFilters.push(f);
    }
  }

  const conditions: SQL<boolean>[] = otherFilters.map(buildFieldCondition);

  if (airlineIsValues.length > 0) {
    const uniq = Array.from(new Set(airlineIsValues));
    const orConds = uniq.map(
      (v) => sql<boolean>`${aircraft.livery} = ${v} COLLATE NOCASE`
    );
    conditions.push(
      createAircraftWithLiverySubquery(combineOrConditions(orConds))
    );
  }

  if (airlineIsNotValues.length > 0) {
    const uniq = Array.from(new Set(airlineIsNotValues));
    const orConds = uniq.map(
      (v) => sql<boolean>`${aircraft.livery} = ${v} COLLATE NOCASE`
    );
    conditions.push(
      createAircraftWithLiveryNotSubquery(combineOrConditions(orConds))
    );
  }
  const combinedCondition = combineConditions(conditions);

  const result = await db
    .select({ id: routes.id })
    .from(routes)
    .leftJoin(routesFlightNumbers, eq(routes.id, routesFlightNumbers.routeId))
    .leftJoin(routeAircraft, eq(routes.id, routeAircraft.routeId))
    .where(combinedCondition)
    .groupBy(routes.id);

  return result.map((r) => r.id);
}

function buildFtsMatchQuery(query: string): string {
  return query
    .trim()
    .split(/\s+/)
    .map((t) => `"${t.replace(/"/g, '""')}"*`)
    .join(' AND ');
}

async function searchRoutesWithFts(
  query: string,
  page: number,
  limit: number
): Promise<PaginatedResult<RouteWithNumbers>> {
  if (!query.trim()) {
    return getRoutesPaginated(page, limit);
  }

  const ftsQuery = buildFtsMatchQuery(query);

  const ftsResult = await db.$client.execute({
    sql: `SELECT route_id FROM routes_fts WHERE routes_fts MATCH ?`,
    args: [ftsQuery],
  });

  if (ftsResult.rows.length === 0) {
    return { routes: [], total: 0 };
  }

  const ids = ftsResult.rows.map((row) => String(row.route_id ?? row[0]));
  const whereCondition = inArray(routes.id, ids) as unknown as SQL<boolean>;

  const result = await buildPaginatedQuery(whereCondition, page, limit);
  return {
    routes: result.map(({ ...route }) =>
      transformRouteResult(route as RouteRow)
    ),
    total: result[0]?.totalCount ?? 0,
  };
}

async function findRouteIdsByFtsSearch(query: string): Promise<string[]> {
  if (!query.trim()) {
    return [];
  }

  const ftsQuery = buildFtsMatchQuery(query);

  const ftsResult = await db.$client.execute({
    sql: `SELECT route_id FROM routes_fts WHERE routes_fts MATCH ?`,
    args: [ftsQuery],
  });

  return ftsResult.rows.map((row) => String(row.route_id ?? row[0]));
}

export {
  filterRoutesAdvanced,
  findRouteIdsByFilters,
  findRouteIdsByFtsSearch,
  getRouteById,
  getRoutesByAirports,
  getRoutesByFlightNumber,
  getRoutesPaginated,
  searchRoutesWithFts,
};
