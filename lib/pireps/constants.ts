export const PIREP_STATUSES = ['pending', 'approved', 'denied'] as const;
export type PirepStatus = (typeof PIREP_STATUSES)[number];

export const PIREP_CATEGORIES = ['casual', 'career'] as const;
export type PirepCategory = (typeof PIREP_CATEGORIES)[number];

export const STATUS_OPTIONS: { value: PirepStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
];

export const CATEGORY_OPTIONS: { value: PirepCategory; label: string }[] = [
  { value: 'casual', label: 'Casual' },
  { value: 'career', label: 'Career' },
];
