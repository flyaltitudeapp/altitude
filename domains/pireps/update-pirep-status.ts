import { eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import { logPirepEvent } from '@/db/queries/pireps';
import { getCareerFlightTimeForUser } from '@/db/queries/users';
import { pireps } from '@/db/schema';
import { maybeScheduleRankup } from '@/lib/rankup-trigger';

type PirepStatus = 'pending' | 'approved' | 'denied';

async function updatePirepStatusInDb(
  pirepId: string,
  status: PirepStatus,
  deniedReason?: string | null
): Promise<void> {
  await db
    .update(pireps)
    .set({
      status,
      deniedReason: status === 'denied' ? (deniedReason ?? '') : '',
      updatedAt: new Date(),
    })
    .where(eq(pireps.id, pirepId));
}

async function updateBulkPirepStatusInDb(
  pirepIds: string[],
  status: PirepStatus,
  deniedReason?: string | null
): Promise<void> {
  await db
    .update(pireps)
    .set({
      status,
      deniedReason: status === 'denied' ? (deniedReason ?? '') : '',
      updatedAt: new Date(),
    })
    .where(inArray(pireps.id, pirepIds));
}

/**
 * @param performedBy User making the change, or null when the system does it.
 * @param action Overrides the logged action name, so an automated approval can
 *   be recorded as `auto_approved` rather than being indistinguishable from a
 *   human `approved`.
 */
export async function updatePirepStatus(
  pirepId: string,
  newStatus: PirepStatus,
  performedBy: string | null,
  deniedReason?: string | null,
  action?: string
) {
  if (
    newStatus === 'denied' &&
    (!deniedReason || deniedReason.trim().length === 0)
  ) {
    throw new Error('Denied reason is required when status is denied');
  }

  const pirepData = await db
    .select({
      userId: pireps.userId,
      flightTime: pireps.flightTime,
      status: pireps.status,
      category: pireps.category,
      deniedReason: pireps.deniedReason,
    })
    .from(pireps)
    .where(eq(pireps.id, pirepId))
    .get();

  if (!pirepData) {
    throw new Error('PIREP not found');
  }

  await updatePirepStatusInDb(pirepId, newStatus, deniedReason);

  const previousValues = {
    status: pirepData.status,
    deniedReason: pirepData.deniedReason,
  };

  const newValues = {
    status: newStatus,
    deniedReason: newStatus === 'denied' ? deniedReason : null,
  };

  await logPirepEvent(
    pirepId,
    action ?? newStatus,
    performedBy,
    newStatus === 'denied' ? (deniedReason ?? undefined) : undefined,
    previousValues,
    newValues
  );

  if (
    newStatus === 'approved' &&
    pirepData.status !== 'approved' &&
    pirepData.category === 'career'
  ) {
    const careerFlightTime = await getCareerFlightTimeForUser(pirepData.userId);
    maybeScheduleRankup(
      pirepData.userId,
      careerFlightTime - pirepData.flightTime,
      careerFlightTime
    );
  }

  return pirepData;
}

export async function updateBulkPirepStatus(
  pirepIds: string[],
  performedBy: string
) {
  if (pirepIds.length === 0) {
    throw new Error('At least one PIREP ID is required');
  }

  const pirepsData = await db
    .select({
      id: pireps.id,
      userId: pireps.userId,
      flightTime: pireps.flightTime,
      status: pireps.status,
      category: pireps.category,
      deniedReason: pireps.deniedReason,
    })
    .from(pireps)
    .where(inArray(pireps.id, pirepIds));

  if (pirepsData.length === 0) {
    throw new Error('No PIREPs found');
  }

  if (pirepsData.length !== pirepIds.length) {
    throw new Error('Some PIREPs were not found');
  }

  await updateBulkPirepStatusInDb(pirepIds, 'approved', null);

  for (const pirepData of pirepsData) {
    const previousValues = {
      status: pirepData.status,
      deniedReason: pirepData.deniedReason,
    };

    const newValues = {
      status: 'approved',
      deniedReason: null,
    };

    await logPirepEvent(
      pirepData.id,
      'approved',
      performedBy,
      undefined,
      previousValues,
      newValues
    );

    // Schedule rankup for newly-approved career PIREPs only
    if (pirepData.status !== 'approved' && pirepData.category === 'career') {
      const careerFlightTime = await getCareerFlightTimeForUser(
        pirepData.userId
      );
      maybeScheduleRankup(
        pirepData.userId,
        careerFlightTime - pirepData.flightTime,
        careerFlightTime
      );
    }
  }

  return pirepsData;
}
