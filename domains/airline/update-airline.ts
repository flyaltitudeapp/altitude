import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { airline } from '@/db/schema';

export interface AirlineUpdateData {
  id: string;
  name: string;
  callsign: string;
  theme?: string;
  pirepsWebhookUrl?: string | null;
  newApplicationsWebhookUrl?: string | null;
  rankUpWebhookUrl?: string | null;
  leaveRequestWebhookUrl?: string | null;
  inactivityWebhookUrl?: string | null;
  typeRatingWebhookUrl?: string | null;
  inactivityPeriod?: number;
  callsignMinRange?: number;
  callsignMaxRange?: number;
  liveFilterSuffix?: string | null;
  liveFilterVirtualOrg?: string | null;
  liveFilterType?: 'suffix' | 'virtual_org';
}

type AirlineUpdateFields = Omit<AirlineUpdateData, 'id'> & {
  updatedAt: Date;
};

async function validateAirlineExists(id: string): Promise<void> {
  const existingAirline = await db
    .select({ id: airline.id })
    .from(airline)
    .where(eq(airline.id, id))
    .get();

  if (!existingAirline) {
    throw new Error('Airline not found');
  }
}

export async function updateAirlineRecord(
  data: AirlineUpdateData
): Promise<void> {
  await validateAirlineExists(data.id);

  // Build update object with only provided fields
  const updateData: Partial<AirlineUpdateFields> = {
    updatedAt: new Date(),
  };

  // Only include fields that are actually provided
  if (data.name !== undefined) {
    updateData.name = data.name;
  }
  if (data.callsign !== undefined) {
    updateData.callsign = data.callsign;
  }
  if (data.theme !== undefined) {
    updateData.theme = data.theme;
  }
  if (data.pirepsWebhookUrl !== undefined) {
    updateData.pirepsWebhookUrl = data.pirepsWebhookUrl || null;
  }
  if (data.newApplicationsWebhookUrl !== undefined) {
    updateData.newApplicationsWebhookUrl =
      data.newApplicationsWebhookUrl || null;
  }
  if (data.rankUpWebhookUrl !== undefined) {
    updateData.rankUpWebhookUrl = data.rankUpWebhookUrl || null;
  }
  if (data.leaveRequestWebhookUrl !== undefined) {
    updateData.leaveRequestWebhookUrl = data.leaveRequestWebhookUrl || null;
  }
  if (data.inactivityWebhookUrl !== undefined) {
    updateData.inactivityWebhookUrl = data.inactivityWebhookUrl || null;
  }
  if (data.typeRatingWebhookUrl !== undefined) {
    updateData.typeRatingWebhookUrl = data.typeRatingWebhookUrl || null;
  }
  if (data.inactivityPeriod !== undefined) {
    updateData.inactivityPeriod = data.inactivityPeriod;
  }
  if (data.callsignMinRange !== undefined) {
    updateData.callsignMinRange = data.callsignMinRange;
  }
  if (data.callsignMaxRange !== undefined) {
    updateData.callsignMaxRange = data.callsignMaxRange;
  }
  if (data.liveFilterSuffix !== undefined) {
    updateData.liveFilterSuffix = data.liveFilterSuffix;
  }
  if (data.liveFilterVirtualOrg !== undefined) {
    updateData.liveFilterVirtualOrg = data.liveFilterVirtualOrg;
  }
  if (data.liveFilterType !== undefined) {
    updateData.liveFilterType = data.liveFilterType;
  }

  const result = await db
    .update(airline)
    .set(updateData)
    .where(eq(airline.id, data.id));

  if (result.rowsAffected === 0) {
    throw new Error('Failed to update airline - no changes made');
  }
}
