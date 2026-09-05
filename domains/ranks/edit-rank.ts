import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { rankAircraft, ranks } from '@/db/schema';

interface EditRankData {
  id: string;
  name: string;
  minimumFlightTime: number;
  maximumFlightTime: number | null | undefined;
  allowAllAircraft: boolean;
  typeRatingSlots: number;
  aircraftIds?: string[];
}

export async function editRank(data: EditRankData) {
  const updateData = {
    name: data.name,
    minimumFlightTime: data.minimumFlightTime,
    maximumFlightTime: data.maximumFlightTime ?? null,
    allowAllAircraft: data.allowAllAircraft,
    typeRatingSlots: data.typeRatingSlots,
    updatedAt: new Date(),
  };

  await db.update(ranks).set(updateData).where(eq(ranks.id, data.id));

  await db.delete(rankAircraft).where(eq(rankAircraft.rankId, data.id));

  if (
    !data.allowAllAircraft &&
    data.aircraftIds &&
    data.aircraftIds.length > 0
  ) {
    const rankAircraftEntries = data.aircraftIds.map((aircraftId) => ({
      id: crypto.randomUUID(),
      rankId: data.id,
      aircraftId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    await db.insert(rankAircraft).values(rankAircraftEntries);
  }
}
