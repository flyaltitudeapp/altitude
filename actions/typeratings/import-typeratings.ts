'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { importTyperatingsFromCsv } from '@/domains/typeratings/import-typeratings';
import { handleDbError } from '@/lib/db-error';
import { createRoleActionClient } from '@/lib/safe-action';

const importTyperatingsSchema = z.object({
  file: z.instanceof(File, { message: 'CSV file required' }),
});

export const importTyperatingsAction = createRoleActionClient(['typeratings'])
  .inputSchema(importTyperatingsSchema)
  .action(async ({ parsedInput }) => {
    try {
      const result = await importTyperatingsFromCsv(parsedInput.file);
      revalidatePath('/admin/typeratings');
      revalidatePath('/admin/users');
      return { success: true, result } as const;
    } catch (error) {
      handleDbError(error, { fallback: 'Failed to import type ratings' });
    }
  });
