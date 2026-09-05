'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { sendTyperatingChangeWebhookNotification } from '@/domains/typeratings/notify-typerating-change';
import { removeTyperating } from '@/domains/typeratings/remove-typerating';
import { createRoleActionClient } from '@/lib/safe-action';

const removeTyperatingSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  typeratingId: z.string().min(1, 'Type rating ID is required'),
});

export const removeTyperatingAction = createRoleActionClient(['users'])
  .inputSchema(removeTyperatingSchema)
  .action(async ({ parsedInput: { userId, typeratingId }, ctx }) => {
    try {
      await removeTyperating(userId, typeratingId);

      await sendTyperatingChangeWebhookNotification({
        userId,
        actorId: ctx.userId,
        action: 'removed',
        typeratingId,
      });

      revalidatePath(`/admin/users/${userId}`);
      revalidatePath('/dashboard');

      return {
        success: true,
        message: 'Type rating removed successfully',
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to remove type rating';
      return { success: false, error: message, message };
    }
  });
