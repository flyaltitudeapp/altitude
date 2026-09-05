import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { getCareerFlightTimeForUser } from '@/db/queries/users';
import { pireps, users } from '@/db/schema';
import { PIREP_CATEGORIES } from '@/lib/pireps/constants';
import { maybeScheduleRankup } from '@/lib/rankup-trigger';

const _transferFlightTimeSchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required'),
  hours: z
    .number()
    .min(0, 'Hours must be non-negative')
    .max(10000, 'Hours must be at most 10000'),
  minutes: z
    .number()
    .min(0, 'Minutes must be non-negative')
    .max(59, 'Minutes must be at most 59'),
  category: z.enum(PIREP_CATEGORIES),
  performedByUserId: z.string().min(1, 'Performed by user ID is required'),
});

type TransferFlightTimeData = z.infer<typeof _transferFlightTimeSchema>;

export async function transferFlightTime(data: TransferFlightTimeData) {
  const { targetUserId, hours, minutes, category, performedByUserId } = data;

  const targetUser = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, targetUserId))
    .get();

  if (!targetUser) {
    throw new Error('Target user not found');
  }

  const performingUser = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, performedByUserId))
    .get();

  if (!performingUser) {
    throw new Error('Performing user not found');
  }

  const totalMinutes = hours * 60 + minutes;

  if (totalMinutes === 0) {
    throw new Error('Flight time must be greater than 0');
  }

  const pirepId = crypto.randomUUID();
  const now = new Date();

  const [newPirep] = await db
    .insert(pireps)
    .values({
      id: pirepId,
      flightNumber: 'TRANSFER',
      date: now,
      departureIcao: 'N/A',
      arrivalIcao: 'N/A',
      flightTime: totalMinutes,
      cargo: 0,
      fuelBurned: 0,
      multiplierId: null,
      aircraftId: null,
      comments: `Transfer done by ${performingUser.name}`,
      deniedReason: '',
      userId: targetUserId,
      status: 'approved',
      category,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (category === 'career') {
    const newCareerFlightTime = await getCareerFlightTimeForUser(targetUserId);
    maybeScheduleRankup(
      targetUserId,
      newCareerFlightTime - totalMinutes,
      newCareerFlightTime
    );
  }

  return { newPirep, totalMinutes };
}
