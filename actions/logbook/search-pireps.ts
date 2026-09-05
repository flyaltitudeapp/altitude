'use server';

import { z } from 'zod';

import {
  getUserPireps,
  getUserPirepsFiltered,
  type PirepFilterCondition,
} from '@/db/queries/pireps';
import { authCheck } from '@/lib/auth-check';
import { PIREP_CATEGORIES, PIREP_STATUSES } from '@/lib/pireps/constants';
import { authActionClient } from '@/lib/safe-action';

const filterRowSchema = z
  .object({
    id: z.string(),
    field: z.enum([
      'flightNumber',
      'departureIcao',
      'arrivalIcao',
      'aircraftId',
      'flightTime',
      'cargo',
      'fuelBurned',
      'status',
      'category',
      'date',
    ]),
    operator: z.enum([
      'contains',
      'is',
      'is_not',
      'starts_with',
      'ends_with',
      'greater_than',
      'less_than',
      'greater_equal',
      'less_equal',
      'before',
      'after',
    ]),
    value: z.union([z.string(), z.number()]).optional(),
  })
  .superRefine((row, ctx) => {
    if (row.field === 'status' && row.value !== undefined) {
      if (
        typeof row.value !== 'string' ||
        !(PIREP_STATUSES as readonly string[]).includes(row.value)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['value'],
          message: `Invalid status. Expected one of: ${PIREP_STATUSES.join(', ')}`,
        });
      }
    }
    if (row.field === 'category' && row.value !== undefined) {
      if (
        typeof row.value !== 'string' ||
        !(PIREP_CATEGORIES as readonly string[]).includes(row.value)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['value'],
          message: `Invalid category. Expected one of: ${PIREP_CATEGORIES.join(', ')}`,
        });
      }
    }
  });

const fetchUserPirepsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  filters: z.array(filterRowSchema).default([]),
});

export const fetchUserPirepsAction = authActionClient
  .inputSchema(fetchUserPirepsSchema)
  .action(async ({ parsedInput: { page, limit, filters } }) => {
    const session = await authCheck();

    const hasAnyFilter = filters.length > 0;

    const result = hasAnyFilter
      ? await getUserPirepsFiltered(
          session.user.id,
          filters as PirepFilterCondition[],
          page,
          limit
        )
      : await getUserPireps(session.user.id, page, limit);

    return result;
  });
