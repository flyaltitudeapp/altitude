'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { updateAutoApproval } from '@/domains/airline/update-auto-approval';
import { handleDbError } from '@/lib/db-error';
import { AUTO_APPROVAL_MODES } from '@/lib/pireps/verification';
import { createRoleActionClient } from '@/lib/safe-action';

const updateAutoApprovalSchema = z.object({
  id: z.string(),
  autoApprovalMode: z.enum(AUTO_APPROVAL_MODES),
  autoApprovalTolerance: z
    .number()
    .int('Tolerance must be a whole number')
    .min(0, 'Tolerance must be at least 0%')
    .max(100, 'Tolerance must be at most 100%'),
  autoApprovalMinPireps: z
    .number()
    .int('Minimum PIREPs must be a whole number')
    .min(0, 'Minimum PIREPs must be at least 0')
    .max(1000, 'Minimum PIREPs must be at most 1000'),
});

export const updateAutoApprovalAction = createRoleActionClient(['admin'])
  .inputSchema(updateAutoApprovalSchema)
  .action(async ({ parsedInput }) => {
    try {
      await updateAutoApproval(parsedInput);

      revalidatePath('/admin/settings');
      revalidatePath('/admin/pireps');

      return {
        success: true,
        message: 'Auto-approval settings updated successfully',
      };
    } catch (error) {
      handleDbError(error, {
        fallback: 'Failed to update auto-approval settings',
      });
    }
  });
