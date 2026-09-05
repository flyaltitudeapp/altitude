'use client';

import { RanksTable } from './ranks-table';

interface Rank {
  id: string;
  name: string;
  minimumFlightTime: number;
  typeRatingSlots: number;
  createdAt: string | Date;
}

interface SearchableRanksTableProps {
  ranks: Rank[];
  total: number;
  limit?: number;
  onEdit?: (id: string) => void;
}

export function SearchableRanksTable({
  ranks,
  total,
  limit = 10,
  onEdit,
}: SearchableRanksTableProps) {
  return (
    <RanksTable ranks={ranks} total={total} limit={limit} onEdit={onEdit} />
  );
}
