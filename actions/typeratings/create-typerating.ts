'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createTyperating } from '@/domains/typeratings/create-typerating';
import { extractDbErrorMessage } from '@/lib/db-error';
import { createRoleActionClient } from '@/lib/safe-action';

const createTyperatingSchema = z.object({
  name: z
    .string()
    .min(1, 'Type rating name is required')
    .max(100, 'Type rating name must be 100 characters or less'),
  aircraftIds: z.array(z.string()).optional(),
  imageFile: z.instanceof(File).optional(),
});

export const createTyperatingAction = createRoleActionClient(['typeratings'])
  .inputSchema(createTyperatingSchema)
  .action(async ({ parsedInput: { name, aircraftIds, imageFile } }) => {
    try {
      const newTyperating = await createTyperating(
        { name, aircraftIds },
        imageFile
      );

      revalidatePath('/admin/typeratings');

      return {
        success: true,
        message: 'Type rating created successfully',
        typerating: newTyperating,
      };
    } catch (error) {
      const errorMessage = extractDbErrorMessage(error, {
        unique: {
          name: 'A type rating with this name already exists',
        },
        fallback: 'Failed to create type rating',
      });

      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
      };
    }
  });
