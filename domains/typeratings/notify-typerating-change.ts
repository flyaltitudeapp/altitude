import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { getUserTyperatings } from '@/db/queries/typeratings';
import { airline, typeratings, users } from '@/db/schema';
import {
  sendTyperatingChangeWebhook,
  type TyperatingChangeData,
} from '@/lib/webhooks/typeratings';

/**
 * Fire the type rating webhook after an admin assigns or removes a type rating.
 * Reads the pilot's updated list and the acting staff member, then posts to the
 * configured Discord webhook. Failures are swallowed — the webhook is best
 * effort and must never block the assignment itself.
 */
export async function sendTyperatingChangeWebhookNotification(params: {
  userId: string;
  actorId: string;
  action: 'added' | 'removed';
  typeratingId: string;
}): Promise<void> {
  const { userId, actorId, action, typeratingId } = params;

  try {
    const [airlineData, pilot, actor, typerating, currentList] =
      await Promise.all([
        db
          .select({
            name: airline.name,
            callsign: airline.callsign,
            typeRatingWebhookUrl: airline.typeRatingWebhookUrl,
          })
          .from(airline)
          .limit(1)
          .get(),
        db
          .select({ name: users.name, callsign: users.callsign })
          .from(users)
          .where(eq(users.id, userId))
          .get(),
        db
          .select({ name: users.name, callsign: users.callsign })
          .from(users)
          .where(eq(users.id, actorId))
          .get(),
        db
          .select({ name: typeratings.name })
          .from(typeratings)
          .where(eq(typeratings.id, typeratingId))
          .get(),
        getUserTyperatings(userId),
      ]);

    if (!airlineData?.typeRatingWebhookUrl || !pilot || !typerating) {
      return;
    }

    const payload: TyperatingChangeData = {
      userId,
      pilotName: pilot.name,
      pilotCallsign: pilot.callsign?.toString() ?? '',
      action,
      typeratingName: typerating.name,
      currentTyperatings: currentList.map((t) => t.name),
      actorName: actor?.name ?? 'Unknown',
      actorCallsign: actor?.callsign?.toString(),
      changedAt: new Date(),
    };

    await sendTyperatingChangeWebhook(
      airlineData.typeRatingWebhookUrl,
      payload,
      {
        airlineName: airlineData.name,
        airlineCallsign: airlineData.callsign,
        baseUrl: process.env.BETTER_AUTH_URL,
      }
    );
  } catch {
    // Silently fail, webhook is not critical
  }
}
