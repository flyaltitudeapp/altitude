'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { deleteTyperating } from '@/domains/typeratings/delete-typerating';
import { handleDbError } from '@/lib/db-error';
import { createRoleActionClient } from '@/lib/safe-action';

const deleteTyperatingSchema = z.object({
  id: z.string().min(1, 'Type rating ID is required'),
});

const deleteBulkTyperatingsSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export const deleteTyperatingAction = createRoleActionClient(['typeratings'])
  .inputSchema(deleteTyperatingSchema)
  .action(async ({ parsedInput: { id } }) => {
    try {
      const deletedTyperating = await deleteTyperating(id);

      revalidatePath('/admin/typeratings');

      return {
        success: true,
        message: 'Type rating deleted successfully',
        deletedTyperating,
      };
    } catch (error) {
      handleDbError(error, {
        fallback: 'Failed to delete type rating',
        constraint: 'Cannot delete type rating - it is being used by pilots',
        reference:
          'Cannot delete type rating - it has associated data that must be removed first',
      });
    }
  });

export const deleteBulkTyperatingsAction = createRoleActionClient([
  'typeratings',
])
  .inputSchema(deleteBulkTyperatingsSchema)
  .action(async ({ parsedInput: { ids } }) => {
    try {
      await Promise.all(ids.map((id) => deleteTyperating(id)));

      revalidatePath('/admin/typeratings');

      return {
        success: true,
        message: `${ids.length} type rating${ids.length === 1 ? '' : 's'} deleted successfully`,
      };
    } catch (error) {
      handleDbError(error, {
        fallback: 'Failed to delete type ratings',
        constraint:
          'Cannot delete type ratings - they are being used by pilots',
        reference:
          'Cannot delete type ratings - they have associated data that must be removed first',
      });
    }
  });
