import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { typeratings } from '@/db/schema';

import { deleteTyperatingImage } from './upload-typerating-image';

export async function deleteTyperating(id: string) {
  const existing = await db
    .select()
    .from(typeratings)
    .where(eq(typeratings.id, id))
    .limit(1);

  if (existing.length === 0) {
    throw new Error('Type rating not found');
  }

  await db.delete(typeratings).where(eq(typeratings.id, id));

  if (existing[0].image) {
    await deleteTyperatingImage(existing[0].image);
  }

  return existing[0];
}
