'use server';

import { getAircraft } from '@/db/queries';
import { authActionClient } from '@/lib/safe-action';

export const getTyperatingFormDataAction = authActionClient.action(async () => {
  const aircraft = await getAircraft();

  return {
    aircraft,
  };
});
