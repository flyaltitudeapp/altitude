'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { updateEvent } from '@/domains/events/update-event';
import { MAX_CARGO_KG, MAX_FUEL_KG } from '@/lib/constants';
import { extractDbErrorMessage } from '@/lib/db-error';
import { authActionClient } from '@/lib/safe-action';

const updateEventSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  title: z
    .string()
    .min(1, 'Event title is required')
    .max(100, 'Event title must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  imageUrl: z.string().optional(),
  imageFile: z.instanceof(File).optional(),
  departureIcao: z
    .string()
    .length(4, 'Departure ICAO must be exactly 4 characters')
    .regex(/^[A-Z]{4}$/, 'ICAO must contain exactly 4 uppercase letters'),
  arrivalIcao: z
    .string()
    .length(4, 'Arrival ICAO must be exactly 4 characters')
    .regex(/^[A-Z]{4}$/, 'ICAO must contain exactly 4 uppercase letters'),
  departureTime: z.date().refine((date) => {
    const now = new Date();
    return date > now;
  }, 'Departure time must be in the future'),
  flightTime: z
    .number()
    .min(1, 'Flight time must be at least 1 minute')
    .max(1440, 'Flight time must be at most 24 hours'),
  flightNumber: z
    .string()
    .min(1, 'Flight number is required')
    .max(20, 'Flight number must be less than 20 characters'),
  cargo: z
    .number()
    .min(0, 'Cargo must be non-negative')
    .max(
      MAX_CARGO_KG,
      `Cargo must be at most ${MAX_CARGO_KG.toLocaleString()} kg`
    ),
  fuel: z
    .number()
    .min(0, 'Fuel must be non-negative')
    .max(
      MAX_FUEL_KG,
      `Fuel must be at most ${MAX_FUEL_KG.toLocaleString()} kg`
    ),
  multiplierId: z.string().optional(),
  status: z.enum(['draft', 'published', 'cancelled', 'completed']),
  aircraftIds: z
    .array(z.string().min(1, 'Aircraft ID is required'))
    .min(1, 'At least one aircraft must be selected'),
  departureGates: z
    .array(z.string().min(1, 'Gate number is required'))
    .min(1, 'At least one departure gate must be specified'),
  arrivalGates: z
    .array(z.string().min(1, 'Gate number is required'))
    .min(1, 'At least one arrival gate must be specified'),
});

export const updateEventAction = authActionClient
  .inputSchema(updateEventSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const { eventId, imageFile, ...eventData } = parsedInput;
      const result = await updateEvent(
        eventId,
        eventData,
        ctx.userId,
        imageFile
      );

      revalidatePath('/events');
      revalidatePath('/admin/events');
      revalidatePath(`/events/${eventId}`);
      revalidatePath(`/admin/events/${eventId}`);

      return {
        success: true,
        message: 'Event updated successfully',
        event: result.event,
      };
    } catch (error) {
      const errorMessage = extractDbErrorMessage(error, {
        unique: {
          title: 'An event with this title already exists',
          flight_number: 'An event with this flight number already exists',
        },
        fallback: 'Failed to update event',
      });

      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
        details: error instanceof Error ? error.message : String(error),
      };
    }
  });
