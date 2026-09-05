import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { typeratingAircraft, typeratings } from '@/db/schema';

import {
  deleteTyperatingImage,
  uploadTyperatingImage,
} from './upload-typerating-image';

interface EditTyperatingData {
  id: string;
  name: string;
  aircraftIds?: string[];
  removeImage?: boolean;
}

export async function editTyperating(
  data: EditTyperatingData,
  imageFile?: File
) {
  const existing = await db
    .select({ image: typeratings.image })
    .from(typeratings)
    .where(eq(typeratings.id, data.id))
    .get();

  if (!existing) {
    throw new Error('Type rating not found');
  }

  // Resolve the new image value: upload a replacement, clear it, or keep as-is.
  let image = existing.image;
  if (imageFile) {
    image = await uploadTyperatingImage({
      typeratingId: data.id,
      file: imageFile,
    });
  } else if (data.removeImage) {
    image = null;
  }

  await db
    .update(typeratings)
    .set({ name: data.name, image, updatedAt: new Date() })
    .where(eq(typeratings.id, data.id));

  await db
    .delete(typeratingAircraft)
    .where(eq(typeratingAircraft.typeratingId, data.id));

  if (data.aircraftIds && data.aircraftIds.length > 0) {
    const entries = data.aircraftIds.map((aircraftId) => ({
      id: crypto.randomUUID(),
      typeratingId: data.id,
      aircraftId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    await db.insert(typeratingAircraft).values(entries);
  }

  // Clean up the previous file if it was replaced or removed.
  if (existing.image && existing.image !== image) {
    await deleteTyperatingImage(existing.image);
  }
}
