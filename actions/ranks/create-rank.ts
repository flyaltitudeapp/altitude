'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createRank } from '@/domains/ranks/create-rank';
import { extractDbErrorMessage } from '@/lib/db-error';
import { createRoleActionClient } from '@/lib/safe-action';

const createRankSchema = z.object({
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

export const createRankAction = createRoleActionClient(['ranks'])
  .inputSchema(createRankSchema)
  .action(
    async ({
      parsedInput: {
        name,
        minimumFlightTime,
        maximumFlightTime,
        allowAllAircraft,
        aircraftIds,
      },
    }) => {
      try {
        const newRank = await createRank({
          name,
          minimumFlightTime,
          maximumFlightTime: maximumFlightTime ?? null,
          allowAllAircraft,
          aircraftIds,
        });

        revalidatePath('/admin/ranks');

        return {
          success: true,
          message: 'Rank created successfully',
          rank: newRank,
        };
      } catch (error) {
        const errorMessage = extractDbErrorMessage(error, {
          unique: {
            name: 'A rank with this name already exists',
            minimum_flight_time:
              'A rank with this minimum flight time already exists',
          },
          fallback: 'Failed to create rank',
        });

        return {
          success: false,
          error: errorMessage,
          message: errorMessage,
        };
      }
    }
  );
