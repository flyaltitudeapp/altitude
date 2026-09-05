'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { z } from 'zod';

import {
  createPirep,
  sendPirepWebhookNotification,
} from '@/domains/pireps/create-pirep';
import { MAX_CARGO_KG, MAX_FUEL_KG, MAX_PASSENGERS } from '@/lib/constants';
import { extractErrorMessage } from '@/lib/error-handler';
import { authActionClient } from '@/lib/safe-action';

const createPirepSchema = z.object({
  flightNumber: z
    .string()
    .min(1, 'Flight number is required')
    .max(10, 'Flight number must be less than 10 characters'),
  date: z.date(),
  departureIcao: z
    .string()
    .length(4, 'ICAO must be exactly 4 characters')
    .regex(/^[A-Z]{4}$/, 'ICAO must contain exactly 4 uppercase letters'),
  arrivalIcao: z
    .string()
    .length(4, 'ICAO must be exactly 4 characters')
    .regex(/^[A-Z]{4}$/, 'ICAO must contain exactly 4 uppercase letters'),
  flightTime: z.number().min(0, 'Flight time must be non-negative'),
  cargo: z
    .number()
    .min(0, 'Cargo must be non-negative')
    .max(
      MAX_CARGO_KG,
      `Cargo must be at most ${MAX_CARGO_KG.toLocaleString()} kg`
    )
    .optional(),
  fuelBurned: z
    .number()
    .min(0, 'Fuel used must be non-negative')
    .max(
      MAX_FUEL_KG,
      `Fuel used must be at most ${MAX_FUEL_KG.toLocaleString()} kg`
    )
    .optional(),
  passengers: z
    .number()
    .min(0, 'Passengers must be non-negative')
    .max(
      MAX_PASSENGERS,
      `Passengers must be at most ${MAX_PASSENGERS.toLocaleString()}`
    )
    .optional(),
  multiplierId: z.string().optional(),
  aircraftId: z.string().min(1, 'Aircraft is required'),
  comments: z
    .string()
    .max(200, 'Comments must be at most 200 characters')
    .optional(),
  category: z.enum(['casual', 'career'], {
    message: 'Please select a flight category',
  }),
});

export const createPirepAction = authActionClient
  .inputSchema(createPirepSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const { newPirep, adjustedFlightTime } = await createPirep(
        parsedInput,
        ctx.userId
      );

      after(async () => {
        await sendPirepWebhookNotification(
          parsedInput,
          newPirep.id,
          adjustedFlightTime,
          ctx.userId
        );
      });

      revalidatePath('/pireps');

      return {
        success: true,
        message: 'PIREP created successfully',
        pirep: newPirep,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error, 'Failed to create PIREP');
      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
      };
    }
  });
