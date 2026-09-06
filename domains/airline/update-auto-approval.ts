import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { airline } from '@/db/schema';
import type { AutoApprovalMode } from '@/lib/pireps/verification';

export interface AutoApprovalUpdateData {
  id: string;
  autoApprovalMode: AutoApprovalMode;
  autoApprovalTolerance: number;
  autoApprovalMinPireps: number;
}

export async function updateAutoApproval(
  data: AutoApprovalUpdateData
): Promise<void> {
  const existingAirline = await db
    .select({ id: airline.id })
    .from(airline)
    .where(eq(airline.id, data.id))
    .get();

  if (!existingAirline) {
    throw new Error('Airline not found');
  }

  await db
    .update(airline)
    .set({
      autoApprovalMode: data.autoApprovalMode,
      autoApprovalTolerance: data.autoApprovalTolerance,
      autoApprovalMinPireps: data.autoApprovalMinPireps,
      updatedAt: new Date(),
    })
    .where(eq(airline.id, data.id));
}
