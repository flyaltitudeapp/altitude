import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { getUserRank } from '@/db/queries';
import { getMultiplierValue } from '@/db/queries/multipliers';
import { getTyperatedAircraftForUser } from '@/db/queries/typeratings';
import { getCareerFlightTimeForUser } from '@/db/queries/users';
import { aircraft, airline, pireps, users } from '@/db/schema';
import { MAX_CARGO_KG, MAX_FUEL_KG, MAX_PASSENGERS } from '@/lib/constants';
import { formatHoursMinutes } from '@/lib/utils';
import { type PirepData, sendPirepWebhook } from '@/lib/webhooks/pireps';

const ICAO_REGEX = /^[A-Z]{4}$/;

const _createPirepSchema = z.object({
  flightNumber: z
    .string()
    .min(1, 'Flight number is required')
    .max(20, 'Flight number must be less than 20 characters'),
  date: z.date().refine((date) => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999); // End of tomorrow

    return date <= tomorrow;
  }, 'Flight date cannot be more than one day in the future'),
  departureIcao: z
    .string()
    .length(4, 'Departure ICAO must be exactly 4 characters')
    .regex(ICAO_REGEX, 'ICAO must contain exactly 4 uppercase letters (A-Z)'),
  arrivalIcao: z
    .string()
    .length(4, 'Arrival ICAO must be exactly 4 characters')
    .regex(ICAO_REGEX, 'ICAO must contain exactly 4 uppercase letters (A-Z)'),
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

type CreatePirepData = z.infer<typeof _createPirepSchema>;

async function calculateAdjustedFlightTime(
  baseFlightTime: number,
  multiplierId?: string
): Promise<number> {
  if (!multiplierId) {
    return baseFlightTime;
  }

  const multiplierValue = await getMultiplierValue(multiplierId);
  return Math.round(baseFlightTime * multiplierValue);
}

async function validateFlightTimeLimit(
  userId: string,
  flightTime: number
): Promise<void> {
  const currentCareerFlightTime = await getCareerFlightTimeForUser(userId);
  const rank = await getUserRank(currentCareerFlightTime);

  // If no rank exists, no flight time restrictions apply
  if (!rank) {
    return;
  }

  if (rank.maximumFlightTime && flightTime > rank.maximumFlightTime * 60) {
    const entered = formatHoursMinutes(flightTime);
    const limit = formatHoursMinutes(rank.maximumFlightTime * 60);
    throw new Error(
      `The flight time you entered (${entered}) exceeds the maximum allowed for your rank (${rank.name}): ${limit}.`
    );
  }
}

async function validateAircraftPermission(
  userId: string,
  aircraftId: string,
  category: 'casual' | 'career'
): Promise<void> {
  // Casual flying is unrestricted.
  if (category === 'casual') {
    return;
  }

  // Career flying is restricted to aircraft covered by the pilot's typeratings.
  const typeratedAircraft = await getTyperatedAircraftForUser(userId);
  const isAircraftAllowed = typeratedAircraft.some(
    (ac) => ac.id === aircraftId
  );

  if (!isAircraftAllowed) {
    const aircraftData = await db
      .select({ name: aircraft.name, livery: aircraft.livery })
      .from(aircraft)
      .where(eq(aircraft.id, aircraftId))
      .get();

    const aircraftName = aircraftData
      ? `${aircraftData.name} (${aircraftData.livery})`
      : 'Unknown Aircraft';
    throw new Error(
      `You are not type rated for ${aircraftName}. Career PIREPs can only be filed for aircraft covered by your type ratings.`
    );
  }
}

async function createPirepRecord(
  data: CreatePirepData,
  adjustedFlightTime: number,
  userId: string
) {
  const pirepId = crypto.randomUUID();

  const [newPirep] = await db
    .insert(pireps)
    .values({
      id: pirepId,
      flightNumber: data.flightNumber,
      date: data.date,
      departureIcao: data.departureIcao.toUpperCase(),
      arrivalIcao: data.arrivalIcao.toUpperCase(),
      flightTime: adjustedFlightTime,
      cargo: data.cargo ?? null,
      fuelBurned: data.fuelBurned ?? null,
      passengers: data.passengers ?? null,
      multiplierId: data.multiplierId || null,
      aircraftId: data.aircraftId,
      comments: data.comments || null,
      deniedReason: '',
      userId,
      status: 'pending',
      category: data.category,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return newPirep;
}

export async function sendPirepWebhookNotification(
  pirepData: CreatePirepData,
  pirepId: string,
  adjustedFlightTime: number,
  userId: string
) {
  try {
    const [userData, aircraftData, airlineData] = await Promise.all([
      db
        .select({
          name: users.name,
          callsign: users.callsign,
        })
        .from(users)
        .where(eq(users.id, userId))
        .get(),
      db
        .select({
          name: aircraft.name,
          livery: aircraft.livery,
        })
        .from(aircraft)
        .where(eq(aircraft.id, pirepData.aircraftId))
        .get(),
      db
        .select({
          name: airline.name,
          callsign: airline.callsign,
          pirepsWebhookUrl: airline.pirepsWebhookUrl,
        })
        .from(airline)
        .limit(1)
        .get(),
    ]);

    if (!airlineData?.pirepsWebhookUrl) {
      return;
    }

    const webhookPayload: PirepData = {
      id: pirepId,
      pilotName: userData!.name,
      pilotCallsign: userData!.callsign!.toString(),
      aircraft: `${aircraftData!.name} (${aircraftData!.livery})`,
      departure: pirepData.departureIcao.toUpperCase(),
      arrival: pirepData.arrivalIcao.toUpperCase(),
      flightNumber: pirepData.flightNumber,
      flightTime: adjustedFlightTime,
      category: pirepData.category,
      fuel: pirepData.fuelBurned,
      cargo: pirepData.cargo,
      submittedAt: new Date(),
      remarks: pirepData.comments || undefined,
    };

    await sendPirepWebhook(airlineData.pirepsWebhookUrl, webhookPayload, {
      airlineName: airlineData.name,
      airlineCallsign: airlineData.callsign,
      baseUrl: process.env.BETTER_AUTH_URL,
    });
  } catch (error) {
    throw new Error(`Failed to send PIREP webhook for ${pirepId}: ${error}`);
  }
}

export async function createPirep(data: CreatePirepData, userId: string) {
  const adjustedFlightTime = await calculateAdjustedFlightTime(
    data.flightTime,
    data.multiplierId
  );

  await validateFlightTimeLimit(userId, data.flightTime);

  await validateAircraftPermission(userId, data.aircraftId, data.category);

  const newPirep = await createPirepRecord(data, adjustedFlightTime, userId);

  return { newPirep, adjustedFlightTime };
}
