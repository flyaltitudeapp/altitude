import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { getAvailableTyperatingSlots } from '@/db/queries/typeratings';
import { typeratings, userTyperatings } from '@/db/schema';

/**
 * Grant a typerating to a pilot, consuming a slot. Re-checks the pilot's
 * available slots server-side and throws if none remain.
 */
export async function assignTyperating(userId: string, typeratingId: string) {
  const typerating = await db
    .select({ id: typeratings.id })
    .from(typeratings)
    .where(eq(typeratings.id, typeratingId))
    .get();

  if (!typerating) {
    throw new Error('Type rating not found');
  }

  const existing = await db
    .select({ id: userTyperatings.id })
    .from(userTyperatings)
    .where(
      and(
        eq(userTyperatings.userId, userId),
        eq(userTyperatings.typeratingId, typeratingId)
      )
    )
    .get();

  if (existing) {
    throw new Error('This pilot already holds this type rating');
  }

  const availableSlots = await getAvailableTyperatingSlots(userId);
  if (availableSlots <= 0) {
    throw new Error(
      'This pilot has no type rating slots available for their current rank'
    );
  }

  await db.insert(userTyperatings).values({
    id: crypto.randomUUID(),
    userId,
    typeratingId,
    createdAt: new Date(),
  });
}
