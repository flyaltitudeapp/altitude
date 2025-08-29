'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getAircraftById } from '@/db/queries';
import { deleteAircraftRecord } from '@/domains/aircraft/delete-aircraft';
import { extractDbErrorMessage } from '@/lib/db-error';
import { createRoleActionClient } from '@/lib/safe-action';

const deleteAircraftSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export const deleteAircraftAction = createRoleActionClient(['fleet'])
  .inputSchema(deleteAircraftSchema)
  .action(async ({ parsedInput }) => {
    const { id } = parsedInput;

    try {
      const existingAircraft = await getAircraftById(id);

      await deleteAircraftRecord(id);

      revalidatePath('/admin/fleet');
      revalidatePath('/fleet');

      return {
        success: true,
        message: 'Aircraft deleted successfully',
        deletedAircraft: existingAircraft,
      };
    } catch (error) {
      const errorMessage = extractDbErrorMessage(error, {
        constraint: 'Cannot delete aircraft due to database constraints',
        reference: 'Cannot delete aircraft due to associated data',
        fallback: 'Failed to delete aircraft due to database constraints',
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  });
