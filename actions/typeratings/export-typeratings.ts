'use server';

import { exportTyperatingsCsv } from '@/domains/typeratings/export-typeratings';
import { handleDbError } from '@/lib/db-error';
import { createRoleActionClient } from '@/lib/safe-action';

export const exportTyperatingsAction = createRoleActionClient([
  'typeratings',
]).action(async () => {
  try {
    const { csv, filename } = await exportTyperatingsCsv();
    return { success: true, csv, filename } as const;
  } catch (error) {
    handleDbError(error, { fallback: 'Failed to export type ratings' });
  }
});
