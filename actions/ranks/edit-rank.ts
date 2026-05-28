'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { editRank } from '@/domains/ranks/edit-rank';
import { handleDbError } from '@/lib/db-error';
import { createRoleActionClient } from '@/lib/safe-action';

const editRankSchema = z.object({
  id: z.string(),
  name: z
    .string()
    .min(1, 'Rank name is required')
    .max(100, 'Rank name must be 100 characters or less'),
  minimumFlightTime: z.coerce
    .number()
    .min(0, 'Minimum flight time must be 0 or greater'),
  maximumFlightTime: z.coerce
    .number()
    .min(0, 'Maximum flight time must be 0 or greater')
    .optional()
    .nullable(),
  allowAllAircraft: z.boolean().default(false),
  aircraftIds: z.array(z.string()).optional(),
});

export const editRankAction = createRoleActionClient(['ranks'])
  .inputSchema(editRankSchema)
  .action(
    async ({
      parsedInput: {
        id,
        name,
        minimumFlightTime,
        maximumFlightTime,
        allowAllAircraft,
        aircraftIds,
      },
    }) => {
      try {
        await editRank({
          id,
          name,
          minimumFlightTime,
          maximumFlightTime,
          allowAllAircraft,
          aircraftIds,
        });

        revalidatePath('/admin/ranks');

        return {
          success: true,
          message: 'Rank updated successfully',
        };
      } catch (error) {
        handleDbError(error, {
          unique: {
            name: 'A rank with this name already exists',
            minimum_flight_time:
              'A rank with this minimum flight time already exists',
          },
          fallback: 'Failed to update rank',
        });
      }
    }
  );
