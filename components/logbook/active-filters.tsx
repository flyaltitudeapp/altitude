'use client';

import { X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PirepFilterCondition } from '@/db/queries/pireps';
import { CATEGORY_OPTIONS, STATUS_OPTIONS } from '@/lib/pireps/constants';

interface AircraftWithLivery {
  id: string;
  name: string;
  livery?: string;
}

interface ActiveFiltersProps {
  aircraft: AircraftWithLivery[];
  currentFilters: PirepFilterCondition[];
  isExecuting?: boolean;
  onFiltersChange: (filters: PirepFilterCondition[]) => Promise<void>;
  onEditFilter: (filter: PirepFilterCondition) => void;
}

const FIELD_LABELS: Record<string, string> = {
  flightNumber: 'Flight Number',
  departureIcao: 'Departure',
  arrivalIcao: 'Arrival',
  aircraftId: 'Aircraft',
  flightTime: 'Flight Time',
  cargo: 'Cargo',
  fuelBurned: 'Fuel Burned',
  status: 'Status',
  category: 'Category',
  date: 'Date',
};

const OPERATOR_LABELS: Record<string, string> = {
  contains: 'contains',
  is: 'is',
  is_not: 'is not',
  starts_with: 'starts with',
  ends_with: 'ends with',
  greater_than: 'above',
  less_than: 'below',
  greater_equal: 'at or above',
  less_equal: 'at or below',
  before: 'before',
  after: 'after',
};

const convertMinutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export function ActiveFilters({
  aircraft,
  currentFilters,
  isExecuting,
  onFiltersChange,
  onEditFilter,
}: ActiveFiltersProps) {
  const removeFilter = async (filterId: string) => {
    const updatedFilters = currentFilters.filter((f) => f.id !== filterId);
    await onFiltersChange(updatedFilters);
  };

  const clearAllFilters = async () => {
    await onFiltersChange([]);
  };

  const getDisplayValue = (filter: PirepFilterCondition): string => {
    if (filter.field === 'aircraftId' && filter.value) {
      const aircraft_item = aircraft.find((a) => a.id === filter.value);
      if (aircraft_item) {
        return `${aircraft_item.name}${aircraft_item.livery ? ` (${aircraft_item.livery})` : ''}`;
      }
    }
    if (filter.field === 'status' && filter.value) {
      const status = STATUS_OPTIONS.find((s) => s.value === filter.value);
      return status?.label || filter.value.toString();
    }
    if (filter.field === 'category' && filter.value) {
      const category = CATEGORY_OPTIONS.find((c) => c.value === filter.value);
      return category?.label || filter.value.toString();
    }
    if (filter.field === 'flightTime' && typeof filter.value === 'number') {
      return convertMinutesToTime(filter.value);
    }
    if (filter.field === 'date' && typeof filter.value === 'number') {
      return formatDate(new Date(filter.value));
    }
    return filter.value?.toString() || '';
  };

  if (currentFilters.length === 0) {
    return null;
  }

  return (
    <div className="bg-background">
      <div className="flex flex-col gap-2 min-h-10 pl-0 pr-0">
        <div className="flex items-center gap-2 flex-shrink-0">
          {currentFilters.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              disabled={isExecuting}
              className="h-8"
            >
              Clear all
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 min-h-0 overflow-hidden pr-4">
          {currentFilters.map((filter) => (
            <Badge
              key={filter.id}
              variant="default"
              className="gap-1 px-2 py-1 text-xs cursor-pointer hover:bg-primary/90 flex-shrink-0 max-w-full"
              onClick={() => onEditFilter(filter)}
            >
              <span className="font-medium truncate">
                {FIELD_LABELS[filter.field]}
              </span>
              <span className="truncate">
                {OPERATOR_LABELS[filter.operator]}
              </span>
              <span className="font-medium truncate">
                {getDisplayValue(filter)}
              </span>
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive flex-shrink-0"
                style={{ pointerEvents: 'auto' }}
                onClick={(e) => {
                  e.stopPropagation();
                  removeFilter(filter.id);
                }}
              />
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
