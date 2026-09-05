import { getAirline } from '@/db/queries/airline';
import {
  getAllTyperatings,
  getAllUsersWithCallsign,
  getAllUserTyperatingPairs,
} from '@/db/queries/typeratings';
import { formatFullCallsign } from '@/lib/utils';

/** Wrap a CSV field, escaping quotes and quoting when it contains a delimiter. */
function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Build a CSV where each row is a pilot (keyed by full callsign) and each
 * column after the callsign is a type rating, holding TRUE/FALSE for whether
 * the pilot currently holds it. This is the round-trip format the importer
 * reads back in.
 */
export async function exportTyperatingsCsv(): Promise<{
  csv: string;
  filename: string;
}> {
  const [airline, typeratings, users, pairs] = await Promise.all([
    getAirline(),
    getAllTyperatings(),
    getAllUsersWithCallsign(),
    getAllUserTyperatingPairs(),
  ]);

  const heldByUser = new Map<string, Set<string>>();
  for (const { userId, typeratingId } of pairs) {
    let set = heldByUser.get(userId);
    if (!set) {
      set = new Set<string>();
      heldByUser.set(userId, set);
    }
    set.add(typeratingId);
  }

  const header = ['Callsign', 'Name', ...typeratings.map((t) => t.name)];
  const lines = [header.map(csvField).join(',')];

  for (const user of users) {
    const callsign = airline?.callsign
      ? formatFullCallsign(airline.callsign, user.callsign)
      : String(user.callsign);
    const held = heldByUser.get(user.id);
    const row = [
      callsign,
      user.name,
      ...typeratings.map((t) => (held?.has(t.id) ? 'TRUE' : 'FALSE')),
    ];
    lines.push(row.map(csvField).join(','));
  }

  return {
    csv: lines.join('\r\n'),
    filename: 'type-ratings.csv',
  };
}
