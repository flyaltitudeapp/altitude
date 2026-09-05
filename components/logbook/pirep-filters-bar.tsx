'use client';

import { Filter, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  PirepFilterCondition,
  PirepFilterField,
} from '@/db/queries/pireps';
import { useIsMobile } from '@/hooks/use-mobile';
import { CATEGORY_OPTIONS, STATUS_OPTIONS } from '@/lib/pireps/constants';
import { convertMinutesToTime, convertTimeToMinutes } from '@/lib/utils';
import type { FilterOperator } from '@/types/database';

interface AircraftWithLivery {
  id: string;
  name: string;
  livery?: string;
}

interface PirepFiltersBarProps {
  aircraft: AircraftWithLivery[];
  currentFilters: PirepFilterCondition[];
  isExecuting?: boolean;
  onFiltersChange: (filters: PirepFilterCondition[]) => Promise<void>;
  showFilterButtonOnly?: boolean;
  editingFilter?: PirepFilterCondition | null;
  onEditFilter?: (filter: PirepFilterCondition) => void;
  onClearEditingFilter?: () => void;
}

const FIELD_LABELS: Record<PirepFilterField, string> = {
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

const OPERATOR_LABELS: Record<FilterOperator, string> = {
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

const FIELD_MAX_LENGTHS: Partial<Record<PirepFilterField, number>> = {
  flightNumber: 8,
  departureIcao: 4,
  arrivalIcao: 4,
  cargo: 8,
  fuelBurned: 8,
  flightTime: 5, // hh:mm
  date: 10, // yyyy-mm-dd
  status: 8,
  category: 8,
  aircraftId: 36, // uuid length
};

const DEFAULT_MAX_LENGTH = 16;

const getMaxLengthForField = (field: PirepFilterField): number => {
  return FIELD_MAX_LENGTHS[field] ?? DEFAULT_MAX_LENGTH;
};

const getOperatorsForField = (field: PirepFilterField): FilterOperator[] => {
  switch (field) {
    case 'flightTime':
    case 'cargo':
    case 'fuelBurned':
      return [
        'is',
        'is_not',
        'greater_than',
        'less_than',
        'greater_equal',
        'less_equal',
      ];
    case 'aircraftId':
    case 'status':
    case 'category':
      return ['is', 'is_not'];
    case 'date':
      return ['is', 'before', 'after'];
    default:
      return ['contains', 'is', 'is_not', 'starts_with', 'ends_with'];
  }
};

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const parseDate = (dateString: string): Date | null => {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

export function PirepFiltersBar({
  aircraft,
  currentFilters,
  isExecuting,
  onFiltersChange,
  showFilterButtonOnly,
  editingFilter: externalEditingFilter,
  onEditFilter: externalOnEditFilter,
  onClearEditingFilter: externalOnClearEditingFilter,
}: PirepFiltersBarProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [internalEditingFilter, setInternalEditingFilter] =
    useState<PirepFilterCondition | null>(null);

  // Use external state if provided, otherwise use internal state
  const editingFilter = externalEditingFilter ?? internalEditingFilter;
  const setEditingFilter = externalOnEditFilter
    ? (filter: PirepFilterCondition | null) => {
        if (filter) {
          externalOnEditFilter(filter);
        } else if (externalOnClearEditingFilter) {
          externalOnClearEditingFilter();
        }
      }
    : setInternalEditingFilter;

  const addNewFilter = () => {
    const newFilter: PirepFilterCondition = {
      id:
        globalThis.crypto?.randomUUID?.() ??
        Math.random().toString(36).slice(2),
      field: 'flightNumber',
      operator: 'contains',
      value: '',
    };
    setEditingFilter(newFilter);
    setIsOpen(true);
  };

  // Handle external editing filter changes
  useEffect(() => {
    if (externalEditingFilter && !isOpen) {
      setIsOpen(true);
    }
  }, [externalEditingFilter, isOpen]);

  const editFilter = (filter: PirepFilterCondition) => {
    setEditingFilter(filter);
    setIsOpen(true);
  };

  const saveFilter = async (filter: PirepFilterCondition) => {
    const filterToSave = { ...filter };

    // Enforce max length for value if string
    const maxLength = getMaxLengthForField(filter.field);
    if (
      typeof filterToSave.value === 'string' &&
      filterToSave.value.length > maxLength
    ) {
      filterToSave.value = filterToSave.value.slice(0, maxLength);
    }

    // Convert values based on field type
    if (filter.field === 'flightTime' && typeof filter.value === 'string') {
      const minutes = convertTimeToMinutes(filter.value);
      if (minutes !== null) {
        filterToSave.value = minutes;
      } else {
        return; // invalid time string, do not save
      }
    } else if (
      (filter.field === 'cargo' || filter.field === 'fuelBurned') &&
      typeof filter.value === 'string'
    ) {
      const numValue = parseInt(filter.value, 10);
      if (!isNaN(numValue)) {
        filterToSave.value = numValue;
      } else {
        return; // invalid number, do not save
      }
    } else if (filter.field === 'date' && typeof filter.value === 'string') {
      const date = parseDate(filter.value);
      if (date) {
        filterToSave.value = date.getTime();
      } else {
        return; // invalid date, do not save
      }
    }

    if (filterToSave.value !== undefined && filterToSave.value !== '') {
      const updatedFilters = currentFilters.some(
        (f) => f.id === filterToSave.id
      )
        ? currentFilters.map((f) =>
            f.id === filterToSave.id ? filterToSave : f
          )
        : [...currentFilters, filterToSave];

      await onFiltersChange(updatedFilters);
    }
    setEditingFilter(null);
    setIsOpen(false);
  };

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

  if (showFilterButtonOnly) {
    return (
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setEditingFilter(null);
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="default"
            onClick={addNewFilter}
            disabled={isExecuting}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 max-w-[calc(100vw-2rem)] p-4 border-0 bg-card shadow-lg"
          align="end"
          side="bottom"
          sideOffset={4}
          alignOffset={isMobile ? -8 : 0}
          collisionPadding={
            isMobile ? 16 : { top: 8, bottom: 8, left: 16, right: 8 }
          }
        >
          {editingFilter && (
            <FilterEditor
              filter={editingFilter}
              aircraft={aircraft}
              onSave={saveFilter}
              onCancel={() => {
                setEditingFilter(null);
                setIsOpen(false);
              }}
            />
          )}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="bg-background">
      <div className="flex flex-col gap-2 min-h-10 pl-0 pr-0">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="default"
            onClick={addNewFilter}
            disabled={isExecuting}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>

          {currentFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              disabled={isExecuting}
              className="h-8 text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          )}

          {isExecuting && (
            <div className="ml-auto">
              <div className="text-sm text-muted-foreground">
                Applying filters...
              </div>
            </div>
          )}
        </div>

        {currentFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 min-h-0 overflow-hidden">
            {currentFilters.map((filter) => (
              <Badge
                key={filter.id}
                variant="secondary"
                className="gap-1 px-2 py-1 text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground flex-shrink-0 max-w-full"
                onClick={() => editFilter(filter)}
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
        )}
      </div>

      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setEditingFilter(null);
          }
        }}
      >
        <PopoverTrigger asChild>
          <div />
        </PopoverTrigger>
        <PopoverContent
          className="w-96 p-4 border-0 bg-card shadow-lg"
          align="end"
          side="bottom"
          sideOffset={4}
          alignOffset={isMobile ? -8 : 0}
          collisionPadding={
            isMobile ? 16 : { top: 8, bottom: 8, left: 16, right: 8 }
          }
        >
          {editingFilter && (
            <FilterEditor
              filter={editingFilter}
              aircraft={aircraft}
              onSave={saveFilter}
              onCancel={() => {
                setEditingFilter(null);
                setIsOpen(false);
              }}
            />
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface FilterEditorProps {
  filter: PirepFilterCondition;
  aircraft: AircraftWithLivery[];
  onSave: (filter: PirepFilterCondition) => void;
  onCancel: () => void;
}

function FilterEditor({
  filter,
  aircraft,
  onSave,
  onCancel,
}: FilterEditorProps) {
  const [localFilter, setLocalFilter] = useState<PirepFilterCondition>(() => {
    if (filter.field === 'flightTime' && typeof filter.value === 'number') {
      return { ...filter, value: convertMinutesToTime(filter.value) };
    }
    if (filter.field === 'date' && typeof filter.value === 'number') {
      return { ...filter, value: formatDate(new Date(filter.value)) };
    }
    return filter;
  });

  const updateFilter = (updates: Partial<PirepFilterCondition>) => {
    const updated = { ...localFilter, ...updates };

    // If field changes, check if operator is valid for new field
    if (updates.field) {
      const validOperators = getOperatorsForField(updates.field);
      if (!validOperators.includes(updated.operator)) {
        updated.operator = validOperators[0];
      }
      updated.value = '';
    }

    // If operator changes, reset value
    if (updates.operator) {
      updated.value = '';
    }

    setLocalFilter(updated);
  };

  const maxLength = getMaxLengthForField(localFilter.field);

  const canSave =
    localFilter.field === 'flightTime'
      ? typeof localFilter.value === 'string' &&
        convertTimeToMinutes(localFilter.value) !== null &&
        localFilter.value.length <= maxLength
      : localFilter.field === 'date'
        ? typeof localFilter.value === 'string' &&
          parseDate(localFilter.value) !== null &&
          localFilter.value.length <= maxLength
        : !!localFilter.value &&
          (typeof localFilter.value !== 'string' ||
            localFilter.value.length <= maxLength);

  const getInputPlaceholder = (field: PirepFilterField): string => {
    switch (field) {
      case 'flightTime':
        return 'HH:MM (e.g., 01:30)';
      case 'departureIcao':
      case 'arrivalIcao':
        return 'e.g., KEWR';
      case 'cargo':
        return 'Weight in kg';
      case 'fuelBurned':
        return 'Fuel in kg';
      case 'date':
        return 'YYYY-MM-DD';
      default:
        return 'Enter value...';
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Field</label>
          <Select
            value={localFilter.field}
            onValueChange={(value: PirepFilterField) =>
              updateFilter({ field: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FIELD_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Condition</label>
          <Select
            value={localFilter.operator}
            onValueChange={(value: FilterOperator) =>
              updateFilter({ operator: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getOperatorsForField(localFilter.field).map((operator) => (
                <SelectItem key={operator} value={operator}>
                  {OPERATOR_LABELS[operator]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Value</label>
          {localFilter.field === 'aircraftId' ? (
            <Select
              value={localFilter.value?.toString() || ''}
              onValueChange={(value) => updateFilter({ value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select aircraft..." />
              </SelectTrigger>
              <SelectContent>
                {aircraft.map((ac) => (
                  <SelectItem key={ac.id} value={ac.id}>
                    {ac.name}
                    {ac.livery ? ` (${ac.livery})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : localFilter.field === 'status' ? (
            <Select
              value={localFilter.value?.toString() || ''}
              onValueChange={(value) => updateFilter({ value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status..." />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : localFilter.field === 'category' ? (
            <Select
              value={localFilter.value?.toString() || ''}
              onValueChange={(value) => updateFilter({ value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              type={localFilter.field === 'date' ? 'date' : 'text'}
              placeholder={getInputPlaceholder(localFilter.field)}
              value={localFilter.value?.toString() || ''}
              onChange={(e) => {
                let value = e.target.value;
                if (value.length > maxLength) {
                  value = value.slice(0, maxLength);
                }
                updateFilter({ value });
              }}
              maxLength={maxLength}
            />
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => onSave(localFilter)}
          disabled={!canSave}
        >
          Save Filter
        </Button>
      </div>
    </div>
  );
}
