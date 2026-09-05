import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { typeratingAircraft, typeratings } from '@/db/schema';

import { uploadTyperatingImage } from './upload-typerating-image';

interface CreateTyperatingData {
  name: string;
  aircraftIds?: string[];
}

export async function createTyperating(
  data: CreateTyperatingData,
  imageFile?: File
) {
  const typeratingId = crypto.randomUUID();

  const newTyperating = await db
    .insert(typeratings)
    .values({
      id: typeratingId,
      name: data.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  if (data.aircraftIds && data.aircraftIds.length > 0) {
    const entries = data.aircraftIds.map((aircraftId) => ({
      id: crypto.randomUUID(),
      typeratingId,
      aircraftId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await db.insert(typeratingAircraft).values(entries);
  }

  if (imageFile) {
    const image = await uploadTyperatingImage({
      typeratingId,
      file: imageFile,
    });
    const [updated] = await db
      .update(typeratings)
      .set({ image, updatedAt: new Date() })
      .where(eq(typeratings.id, typeratingId))
      .returning();
    return updated;
  }

  return newTyperating[0];
}
