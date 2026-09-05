export interface PirepData {
  id: string;
  pilotName: string;
  pilotCallsign: string;
  aircraft: string;
  departure: string;
  arrival: string;
  flightNumber: string;
  flightTime: number;
  category: 'casual' | 'career';
  fuel?: number;
  cargo?: number;
  submittedAt: Date;
  remarks?: string;
}

export interface LeaveRequestData {
  id: string;
  pilotName: string;
  pilotCallsign: string;
  reason: string;
  startDate: Date;
  endDate: Date;
  submittedAt: Date;
}

export interface ApplicationData {
  userId: string;
  email: string;
  name: string;
  callsign?: number;
  discordUsername: string;
  submittedAt: Date;
}

export interface RankupData {
  userId: string;
  pilotName: string;
  pilotCallsign: string;
  previousRank: string | null;
  newRank: string;
  totalFlightTime: number;
  achievedAt: Date;
}

export interface TyperatingChangeData {
  userId: string;
  pilotName: string;
  pilotCallsign: string;
  action: 'added' | 'removed';
  typeratingName: string;
  // The pilot's full list of held type ratings after the change.
  currentTyperatings: string[];
  // The staff member who performed the change.
  actorName: string;
  actorCallsign?: string;
  changedAt: Date;
}

export interface WebhookOptions {
  airlineName: string;
  airlineCallsign: string;
  baseUrl?: string;
}
