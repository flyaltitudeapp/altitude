'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { editTyperating } from '@/domains/typeratings/edit-typerating';
import { handleDbError } from '@/lib/db-error';
import { createRoleActionClient } from '@/lib/safe-action';

const editTyperatingSchema = z.object({
  id: z.string(),
  name: z
    .string()
    .min(1, 'Type rating name is required')
    .max(100, 'Type rating name must be 100 characters or less'),
  aircraftIds: z.array(z.string()).optional(),
  removeImage: z.boolean().optional(),
  imageFile: z.instanceof(File).optional(),
});

export const editTyperatingAction = createRoleActionClient(['typeratings'])
  .inputSchema(editTyperatingSchema)
  .action(
    async ({
      parsedInput: { id, name, aircraftIds, removeImage, imageFile },
    }) => {
      try {
        await editTyperating({ id, name, aircraftIds, removeImage }, imageFile);

        revalidatePath('/admin/typeratings');

        return {
          success: true,
          message: 'Type rating updated successfully',
        };
      } catch (error) {
        handleDbError(error, {
          unique: {
            name: 'A type rating with this name already exists',
          },
          fallback: 'Failed to update type rating',
        });
      }
    }
  );
