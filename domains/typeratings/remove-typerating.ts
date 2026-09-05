import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { userTyperatings } from '@/db/schema';

export async function removeTyperating(userId: string, typeratingId: string) {
  await db
    .delete(userTyperatings)
    .where(
      and(
        eq(userTyperatings.userId, userId),
        eq(userTyperatings.typeratingId, typeratingId)
      )
    );
}
