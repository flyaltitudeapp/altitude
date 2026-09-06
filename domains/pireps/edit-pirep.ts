import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { logPirepEvent } from '@/db/queries/pireps';
import { getCareerFlightTimeForUser } from '@/db/queries/users';
import { multipliers, pireps } from '@/db/schema';
import { verifyPirepSafely } from '@/domains/pireps/verification';
import { maybeScheduleRankup } from '@/lib/rankup-trigger';
import { hasRequiredRole, parseRolesField } from '@/lib/roles';

const editableFieldsSchema = z.object({
  flightNumber: z.string().max(10).optional(),
  departureIcao: z.string().length(4).optional(),
  arrivalIcao: z.string().length(4).optional(),
  flightTime: z.coerce.number().int().positive().optional(),
  cargo: z.coerce.number().int().nonnegative().optional(),
  fuelBurned: z.coerce.number().int().nonnegative().optional(),
  passengers: z.coerce.number().int().nonnegative().optional(),
  multiplierId: z.string().optional().nullable(),
  aircraftId: z.string().optional().nullable(),
  comments: z.string().optional().nullable(),
  deniedReason: z.string().optional().nullable(),
});

export const editPirepSchema = z
  .object({ id: z.string() })
  .merge(editableFieldsSchema)
  .refine(
    (data) =>
      Object.keys(data).some(
        (key) => key !== 'id' && data[key as keyof typeof data] !== undefined
      ),
    { message: 'No fields provided to update' }
  );

type EditableFields = z.infer<typeof editableFieldsSchema>;

async function getMultiplierValues(
  ids: (string | null)[]
): Promise<Map<string, number>> {
  const validIds = ids.filter((id): id is string => id !== null);
  if (validIds.length === 0) {
    return new Map();
  }

  const results = await db
    .select({ id: multipliers.id, value: multipliers.value })
    .from(multipliers)
    .where(inArray(multipliers.id, validIds));

  return new Map(results.map((r) => [r.id, r.value]));
}

export async function editPirep(
  data: z.infer<typeof editPirepSchema>,
  userId: string,
  userRolesRaw: string
) {
  const { id, ...updates } = data;

  const current = await db
    .select({
      userId: pireps.userId,
      flightNumber: pireps.flightNumber,
      departureIcao: pireps.departureIcao,
      arrivalIcao: pireps.arrivalIcao,
      flightTime: pireps.flightTime,
      cargo: pireps.cargo,
      fuelBurned: pireps.fuelBurned,
      passengers: pireps.passengers,
      multiplierId: pireps.multiplierId,
      aircraftId: pireps.aircraftId,
      comments: pireps.comments,
      deniedReason: pireps.deniedReason,
      status: pireps.status,
      category: pireps.category,
    })
    .from(pireps)
    .where(eq(pireps.id, id))
    .get();

  if (!current) {
    throw new Error('PIREP not found');
  }

  const userRoles = parseRolesField(userRolesRaw);
  const hasPirepsRole = hasRequiredRole(userRoles, ['pireps']);

  if (current.status === 'pending') {
    const isOwnPirep = current.userId === userId;
    if (!isOwnPirep && !hasPirepsRole) {
      throw new Error(
        'Access denied. You can only edit your own pending PIREPs or need the pireps role'
      );
    }
  } else {
    if (!hasPirepsRole) {
      throw new Error(
        'Access denied. Only users with the pireps role can edit non-pending PIREPs'
      );
    }
  }

  if (updates.multiplierId !== undefined) {
    const multiplierMap = await getMultiplierValues([
      current.multiplierId,
      updates.multiplierId,
    ]);

    const oldMultiplier = current.multiplierId
      ? (multiplierMap.get(current.multiplierId) ?? 1)
      : 1;
    const newMultiplier = updates.multiplierId
      ? (multiplierMap.get(updates.multiplierId) ?? 1)
      : 1;

    const baseTime = Math.round(current.flightTime / oldMultiplier);
    const newFlightTime = Math.round(baseTime * newMultiplier);

    if (newFlightTime !== current.flightTime) {
      updates.flightTime = newFlightTime;
    }
  }

  const updateSet: Partial<typeof pireps.$inferInsert> = {
    updatedAt: new Date(),
  };

  const validKeys = Object.keys(
    editableFieldsSchema.shape
  ) as (keyof EditableFields)[];
  const changes: string[] = [];
  const previousValues: Record<string, string | number | null> = {};
  const newValues: Record<string, string | number | null> = {};

  for (const key of validKeys) {
    const value = updates[key];
    if (value !== undefined) {
      (updateSet as Record<string, unknown>)[key] = value;

      // Capture previous and new values for logging
      previousValues[key] = current[key as keyof typeof current];
      newValues[key] = value;

      // Create human-readable change descriptions
      let changeDesc = '';
      switch (key) {
        case 'flightNumber':
          changeDesc = `Flight number to "${value}"`;
          break;
        case 'departureIcao':
          changeDesc = `Departure to ${value}`;
          break;
        case 'arrivalIcao':
          changeDesc = `Arrival to ${value}`;
          break;
        case 'flightTime':
          changeDesc = `Flight time to ${Math.round((Number(value) / 60) * 10) / 10}h`;
          break;
        case 'cargo':
          changeDesc = `Cargo to ${value} kg`;
          break;
        case 'fuelBurned':
          changeDesc = `Fuel burned to ${value} kg`;
          break;
        case 'passengers':
          changeDesc = `Passengers to ${value}`;
          break;
        case 'comments':
          changeDesc = value ? `Comments to "${value}"` : 'Comments cleared';
          break;
        case 'deniedReason':
          changeDesc = value
            ? `Denial reason to "${value}"`
            : 'Denial reason cleared';
          break;
        default:
          changeDesc = `${key} updated`;
      }
      changes.push(changeDesc);
    }
  }

  await db.update(pireps).set(updateSet).where(eq(pireps.id, id));

  if (changes.length > 0) {
    const details = changes.join(', ');
    await logPirepEvent(
      id,
      'edited',
      userId,
      details,
      previousValues,
      newValues
    );
  } else {
    await logPirepEvent(id, 'edited', userId);
  }

  // Edits can change the very fields the automated checks look at, so a stale
  // checklist would mislead the next reviewer. Re-evaluating keeps it honest,
  // and a PIREP that now passes is approved on the same terms as at filing.
  if (current.status === 'pending') {
    await verifyPirepSafely(id);
  }

  const newFlightTime = updates.flightTime ?? current.flightTime;
  if (
    newFlightTime !== current.flightTime &&
    current.category === 'career' &&
    current.status === 'approved'
  ) {
    const careerFlightTime = await getCareerFlightTimeForUser(current.userId);
    maybeScheduleRankup(
      current.userId,
      careerFlightTime - (newFlightTime - current.flightTime),
      careerFlightTime
    );
  }
}
