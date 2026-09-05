'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { assignTyperating } from '@/domains/typeratings/assign-typerating';
import { sendTyperatingChangeWebhookNotification } from '@/domains/typeratings/notify-typerating-change';
import { createRoleActionClient } from '@/lib/safe-action';

const assignTyperatingSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  typeratingId: z.string().min(1, 'Type Rating ID is required'),
});

export const assignTyperatingAction = createRoleActionClient(['users'])
  .inputSchema(assignTyperatingSchema)
  .action(async ({ parsedInput: { userId, typeratingId }, ctx }) => {
    try {
      await assignTyperating(userId, typeratingId);

      await sendTyperatingChangeWebhookNotification({
        userId,
        actorId: ctx.userId,
        action: 'added',
        typeratingId,
      });

      revalidatePath(`/admin/users/${userId}`);
      revalidatePath('/dashboard');

      return {
        success: true,
        message: 'Type Rating assigned successfully',
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to assign type rating';
      return { success: false, error: message, message };
    }
  });
