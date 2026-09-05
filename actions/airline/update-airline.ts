'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  AirlineUpdateData,
  updateAirlineRecord,
} from '@/domains/airline/update-airline';
import { handleDbError } from '@/lib/db-error';
import { createRoleActionClient } from '@/lib/safe-action';

const discordWebhookSchema = z
  .string()
  .regex(
    /^(https?:\/\/).*(discord|discordapp)\.com\/api\/webhooks\/([\d]+)\/([a-zA-Z0-9_-]+)$/,
    'Must be a valid Discord webhook URL'
  )
  .optional()
  .or(z.literal(''));

const updateAirlineSchema = z
  .object({
    id: z.string(),
    name: z
      .string()
      .min(1, 'Airline name is required')
      .max(100, 'Airline name must be less than 100 characters')
      .trim(),
    callsign: z
      .string()
      .min(1, 'Callsign is required')
      .max(20, 'Callsign must be less than 20 characters')
      .trim()
      .toUpperCase(),
    theme: z
      .string()
      .trim()
      .refine(
        (v) =>
          v === 'default' ||
          /^[a-z0-9-]+$/i.test(v) ||
          /^https?:\/\//i.test(v) ||
          /^\/.+\.css$/i.test(v),
        'Theme must be a preset slug (e.g., aviation-blue), "default", an absolute URL, or a CSS path beginning with /'
      )
      .optional()
      .default('default'),
    pirepsWebhookUrl: discordWebhookSchema,
    newApplicationsWebhookUrl: discordWebhookSchema,
    rankUpWebhookUrl: discordWebhookSchema,
    leaveRequestWebhookUrl: discordWebhookSchema,
    inactivityWebhookUrl: discordWebhookSchema,
    typeRatingWebhookUrl: discordWebhookSchema,
    inactivityPeriod: z
      .number()
      .int('Inactivity period must be an integer')
      .min(1, 'Inactivity period must be at least 1 day')
      .max(365, 'Inactivity period must be less than 365 days')
      .optional(),
    callsignMinRange: z
      .number()
      .int('Minimum range must be an integer')
      .min(1, 'Minimum range must be at least 1')
      .max(999999, 'Minimum range must be less than 1,000,000')
      .optional(),
    callsignMaxRange: z
      .number()
      .int('Maximum range must be an integer')
      .min(1, 'Maximum range must be at least 1')
      .max(999999, 'Maximum range must be less than 1,000,000')
      .optional(),
    liveFilterSuffix: z.string().optional(),
    liveFilterVirtualOrg: z.string().optional(),
    liveFilterType: z.enum(['suffix', 'virtual_org']).optional(),
  })
  .refine(
    (data) => {
      if (data.callsignMinRange && data.callsignMaxRange) {
        return data.callsignMinRange <= data.callsignMaxRange;
      }
      return true;
    },
    {
      message: 'Minimum range must be less than or equal to maximum range',
      path: ['callsignMinRange'],
    }
  );

export const updateAirlineAction = createRoleActionClient(['admin'])
  .inputSchema(updateAirlineSchema)
  .action(async ({ parsedInput }) => {
    const {
      id,
      name,
      callsign,
      theme,
      pirepsWebhookUrl,
      newApplicationsWebhookUrl,
      rankUpWebhookUrl,
      leaveRequestWebhookUrl,
      inactivityWebhookUrl,
      typeRatingWebhookUrl,
      inactivityPeriod,
      callsignMinRange,
      callsignMaxRange,
      liveFilterSuffix,
      liveFilterVirtualOrg,
      liveFilterType,
    } = parsedInput;

    try {
      await updateAirlineRecord({
        id,
        name,
        callsign,
        theme,
        pirepsWebhookUrl,
        newApplicationsWebhookUrl,
        rankUpWebhookUrl,
        leaveRequestWebhookUrl,
        inactivityWebhookUrl,
        typeRatingWebhookUrl,
        inactivityPeriod,
        callsignMinRange,
        callsignMaxRange,
        liveFilterSuffix,
        liveFilterVirtualOrg,
        liveFilterType,
      } as AirlineUpdateData);

      revalidatePath('/admin/settings');
      revalidatePath('/admin/airline');

      return {
        success: true,
        message: 'Airline updated successfully',
      };
    } catch (error) {
      handleDbError(error, {
        constraint: 'Cannot update airline due to existing dependencies',
        fallback: 'Failed to update airline',
      });
    }
  });
