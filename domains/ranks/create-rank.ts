import { db } from '@/db';
import { rankAircraft, ranks } from '@/db/schema';

interface CreateRankData {
  name: string;
  minimumFlightTime: number;
  maximumFlightTime: number | null;
  allowAllAircraft: boolean;
  typeRatingSlots: number;
  aircraftIds?: string[];
}

export async function createRank(data: CreateRankData) {
  const rankId = crypto.randomUUID();

  const newRank = await db
    .insert(ranks)
    .values({
      id: rankId,
      name: data.name,
      minimumFlightTime: data.minimumFlightTime,
      maximumFlightTime: data.maximumFlightTime,
      allowAllAircraft: data.allowAllAircraft,
      typeRatingSlots: data.typeRatingSlots,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  if (
    !data.allowAllAircraft &&
    data.aircraftIds &&
    data.aircraftIds.length > 0
  ) {
    const rankAircraftEntries = data.aircraftIds.map((aircraftId) => ({
      id: crypto.randomUUID(),
      rankId: rankId,
      aircraftId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await db.insert(rankAircraft).values(rankAircraftEntries);
  }

  return newRank[0];
}
