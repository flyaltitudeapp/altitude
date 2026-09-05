import { parse } from 'csv-parse/sync';
import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import { getAirline } from '@/db/queries/airline';
import {
  getAllTyperatings,
  getAllUsersWithCallsign,
  getAllUserTyperatingPairs,
} from '@/db/queries/typeratings';
import { userTyperatings } from '@/db/schema';

export interface TyperatingImportResult {
  totalRows: number;
  usersUpdated: number;
  usersUnchanged: number;
  usersSkipped: number;
  typeratingsAdded: number;
  typeratingsRemoved: number;
  matchedColumns: number;
  ignoredColumns: string[];
}

/** Normalise any text for case-insensitive matching (callsigns, names). */
function normalize(value: string): string {
  return value.trim().toUpperCase();
}

/** Strip everything but letters/digits — matches `formatFullCallsign` sanitising. */
function normalizeCallsign(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

const TRUE_VALUES = new Set(['TRUE', '1', 'YES', 'Y', 'X', '✓', 'CHECKED']);

function parseBool(value: string): boolean {
  return TRUE_VALUES.has(normalize(value));
}

function isCallsignHeader(header: string): boolean {
  const normalized = normalize(header).replace(/[\s_]/g, '');
  return (
    normalized === 'CALLSIGN' ||
    normalized === 'CALLID' ||
    normalized === 'CALL'
  );
}

/**
 * Bulk-sync type ratings from a CSV exported from a checkbox spreadsheet.
 *
 * The CSV has a callsign column plus one column per type rating (matched by
 * name, case-insensitive) holding TRUE/FALSE. Only pilots whose callsign
 * matches an existing user and columns matching an existing type rating are
 * touched — everything else is ignored. Assignments are applied directly
 * (the rank slot limit is not enforced) since the sheet is authoritative.
 */
export async function importTyperatingsFromCsv(
  file: File
): Promise<TyperatingImportResult> {
  const text = await file.text();
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as Record<string, string>[];

  const [airline, allTyperatings, users, pairs] = await Promise.all([
    getAirline(),
    getAllTyperatings(),
    getAllUsersWithCallsign(),
    getAllUserTyperatingPairs(),
  ]);

  // Map a normalised callsign (both numeric and full forms) to a user id.
  const userByCallsign = new Map<string, string>();
  for (const user of users) {
    userByCallsign.set(normalizeCallsign(String(user.callsign)), user.id);
    if (airline?.callsign) {
      userByCallsign.set(
        normalizeCallsign(`${airline.callsign}${user.callsign}`),
        user.id
      );
    }
  }

  // Map a normalised type-rating name to its id.
  const typeratingByName = new Map<string, string>();
  for (const t of allTyperatings) {
    typeratingByName.set(normalize(t.name), t.id);
  }

  // Current held state per user.
  const heldByUser = new Map<string, Set<string>>();
  for (const { userId, typeratingId } of pairs) {
    let set = heldByUser.get(userId);
    if (!set) {
      set = new Set<string>();
      heldByUser.set(userId, set);
    }
    set.add(typeratingId);
  }

  const headers = records.length > 0 ? Object.keys(records[0]) : [];
  const callsignHeader =
    headers.find(isCallsignHeader) ?? headers[0] ?? 'Callsign';

  // Resolve which columns map to real type ratings.
  const columnToTyperating = new Map<string, string>();
  const ignoredColumns: string[] = [];
  for (const header of headers) {
    if (header === callsignHeader || normalize(header) === 'NAME') {
      // The callsign key and the human-readable Name column (added by export)
      // are structural, not type ratings — skip them silently.
      continue;
    }
    const typeratingId = typeratingByName.get(normalize(header));
    if (typeratingId) {
      columnToTyperating.set(header, typeratingId);
    } else {
      ignoredColumns.push(header);
    }
  }

  const result: TyperatingImportResult = {
    totalRows: records.length,
    usersUpdated: 0,
    usersUnchanged: 0,
    usersSkipped: 0,
    typeratingsAdded: 0,
    typeratingsRemoved: 0,
    matchedColumns: columnToTyperating.size,
    ignoredColumns,
  };

  const toInsert: {
    id: string;
    userId: string;
    typeratingId: string;
    createdAt: Date;
  }[] = [];
  const toRemove: { userId: string; typeratingId: string }[] = [];
  const now = new Date();

  for (const record of records) {
    const rawCallsign = record[callsignHeader] ?? '';
    const userId = userByCallsign.get(normalizeCallsign(rawCallsign));
    if (!userId) {
      result.usersSkipped += 1;
      continue;
    }

    const held = heldByUser.get(userId) ?? new Set<string>();
    let changed = false;

    for (const [header, typeratingId] of columnToTyperating) {
      const desired = parseBool(record[header] ?? '');
      const current = held.has(typeratingId);

      if (desired && !current) {
        toInsert.push({
          id: crypto.randomUUID(),
          userId,
          typeratingId,
          createdAt: now,
        });
        held.add(typeratingId);
        result.typeratingsAdded += 1;
        changed = true;
      } else if (!desired && current) {
        toRemove.push({ userId, typeratingId });
        held.delete(typeratingId);
        result.typeratingsRemoved += 1;
        changed = true;
      }
    }

    heldByUser.set(userId, held);
    if (changed) {
      result.usersUpdated += 1;
    } else {
      result.usersUnchanged += 1;
    }
  }

  // Apply removals grouped by type rating to keep the OR-conditions small.
  const removalsByTyperating = new Map<string, string[]>();
  for (const { userId, typeratingId } of toRemove) {
    const list = removalsByTyperating.get(typeratingId) ?? [];
    list.push(userId);
    removalsByTyperating.set(typeratingId, list);
  }

  for (const [typeratingId, userIds] of removalsByTyperating) {
    for (let i = 0; i < userIds.length; i += 200) {
      const chunk = userIds.slice(i, i + 200);
      await db
        .delete(userTyperatings)
        .where(
          and(
            eq(userTyperatings.typeratingId, typeratingId),
            inArray(userTyperatings.userId, chunk)
          )
        );
    }
  }

  for (let i = 0; i < toInsert.length; i += 200) {
    const chunk = toInsert.slice(i, i + 200);
    await db.insert(userTyperatings).values(chunk);
  }

  return result;
}
