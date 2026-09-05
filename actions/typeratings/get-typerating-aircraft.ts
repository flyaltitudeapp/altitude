'use server';

import { z } from 'zod';

import { getTyperatingAircraft } from '@/db/queries';
import { authActionClient } from '@/lib/safe-action';

const getTyperatingAircraftSchema = z.object({
  typeratingId: z.string(),
});

export const getTyperatingAircraftAction = authActionClient
  .inputSchema(getTyperatingAircraftSchema)
  .action(async ({ parsedInput: { typeratingId } }) => {
    try {
      const result = await getTyperatingAircraft(typeratingId);
      return { success: true, ...result };
    } catch {
      return { success: false, error: 'Failed to fetch type rating aircraft' };
    }
  });
