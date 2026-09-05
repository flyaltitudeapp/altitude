'use client';

import { Filter, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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
import { useIsMobile } from '@/hooks/use-mobile';
import { convertMinutesToTime, convertTimeToMinutes } from '@/lib/utils';

export type FilterOperator =
  | 'contains'
  | 'is'
  | 'is_not'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_equal'
  | 'less_equal';

export type FilterField =
  | 'flightNumber'
  | 'departureIcao'
  | 'arrivalIcao'
  | 'aircraftId'
  | 'flightTime'
  | 'airline';

export interface FilterCondition {
  id: string;
  field: FilterField;
  operator: FilterOperator;
  value?: string | number;
}

interface AircraftWithLivery {
  id: string;
  name: string;
  livery?: string;
}

interface RouteFiltersBarProps {
  aircraft: AircraftWithLivery[];
  currentFilters: FilterCondition[];
  isExecuting?: boolean;
  onFiltersChange: (filters: FilterCondition[]) => Promise<void>;
  showFilterButtonOnly?: boolean;
  editingFilter?: FilterCondition | null;
  onEditFilter?: (filter: FilterCondition) => void;
  onClearEditingFilter?: () => void;
}

const FIELD_LABELS: Record<FilterField, string> = {
  flightNumber: 'Flight Number',
  departureIcao: 'Departure',
  arrivalIcao: 'Arrival',
  aircraftId: 'Aircraft',
  flightTime: 'Flight Time',
  airline: 'Airline',
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
};

const FIELD_MAX_LENGTHS: Partial<Record<FilterField, number>> = {
  flightNumber: 8,
  departureIcao: 4,
  arrivalIcao: 4,
  flightTime: 5, // hh:mm
  aircraftId: 36, // uuid length
  airline: 64,
};

const DEFAULT_MAX_LENGTH = 16;

const getMaxLengthForField = (field: FilterField): number => {
  return FIELD_MAX_LENGTHS[field] ?? DEFAULT_MAX_LENGTH;
};

const getOperatorsForField = (field: FilterField): FilterOperator[] => {
  switch (field) {
    case 'flightTime':
      return [
        'is',
        'is_not',
        'greater_than',
        'less_than',
        'greater_equal',
        'less_equal',
      ];
    case 'aircraftId':
      return ['is', 'is_not'];
    case 'airline':
      return ['is', 'is_not'];
    default:
      return ['contains', 'is', 'is_not', 'starts_with', 'ends_with'];
  }
};

const operatorNeedsValue = (_operator: FilterOperator): boolean => true;

export function RouteFiltersBar({
  aircraft,
  currentFilters,
  isExecuting,
  onFiltersChange,
  showFilterButtonOnly = false,
  editingFilter: externalEditingFilter,
  onEditFilter: externalOnEditFilter,
  onClearEditingFilter: externalOnClearEditingFilter,
}: RouteFiltersBarProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [internalEditingFilter, setInternalEditingFilter] =
    useState<FilterCondition | null>(null);

  // Use external state if provided, otherwise use internal state
  const editingFilter = externalEditingFilter ?? internalEditingFilter;
  const setEditingFilter = externalOnEditFilter
    ? (filter: FilterCondition | null) => {
        if (filter) {
          externalOnEditFilter(filter);
        } else if (externalOnClearEditingFilter) {
          externalOnClearEditingFilter();
        }
      }
    : setInternalEditingFilter;

  const addNewFilter = () => {
    const newFilter: FilterCondition = {
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

  const editFilter = (filter: FilterCondition) => {
    setEditingFilter(filter);
    setIsOpen(true);
  };

  const saveFilter = async (filter: FilterCondition) => {
    const filterToSave = { ...filter };

    const maxLength = getMaxLengthForField(filter.field);
    if (
      typeof filterToSave.value === 'string' &&
      filterToSave.value.length > maxLength
    ) {
      filterToSave.value = filterToSave.value.slice(0, maxLength);
    }

    if (filter.field === 'flightTime' && typeof filter.value === 'string') {
      const minutes = convertTimeToMinutes(filter.value);
      if (minutes !== null) {
        filterToSave.value = minutes;
      } else {
        // invalid time string, do not save
        return;
      }
    }

    if (
      !operatorNeedsValue(filterToSave.operator) ||
      (filterToSave.value !== undefined && filterToSave.value !== '')
    ) {
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

  const getDisplayValue = (filter: FilterCondition): string => {
    if (filter.field === 'aircraftId' && filter.value) {
      const aircraft_item = aircraft.find((a) => a.id === filter.value);
      if (aircraft_item) {
        return `${aircraft_item.name}${aircraft_item.livery ? ` (${aircraft_item.livery})` : ''}`;
      }
    }
    if (filter.field === 'flightTime' && typeof filter.value === 'number') {
      return convertMinutesToTime(filter.value);
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
                {operatorNeedsValue(filter.operator) && (
                  <span className="font-medium truncate">
                    {getDisplayValue(filter)}
                  </span>
                )}
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
  filter: FilterCondition;
  aircraft: AircraftWithLivery[];
  onSave: (filter: FilterCondition) => void;
  onCancel: () => void;
}

function FilterEditor({
  filter,
  aircraft,
  onSave,
  onCancel,
}: FilterEditorProps) {
  const [localFilter, setLocalFilter] = useState<FilterCondition>(() => {
    if (filter.field === 'flightTime' && typeof filter.value === 'number') {
      return { ...filter, value: convertMinutesToTime(filter.value) };
    }
    return filter;
  });

  const updateFilter = (updates: Partial<FilterCondition>) => {
    const updated = { ...localFilter, ...updates };

    // Reset value if operator changes to one that doesn't need value
    if (updates.operator && !operatorNeedsValue(updates.operator)) {
      updated.value = undefined;
    }

    // Reset operator and value if field changes
    if (updates.field) {
      const validOperators = getOperatorsForField(updates.field);
      if (!validOperators.includes(updated.operator)) {
        updated.operator = validOperators[0];
      }
      // Always reset value when field changes
      updated.value = operatorNeedsValue(updated.operator) ? '' : undefined;
    }

    setLocalFilter(updated);
  };

  const maxLength = getMaxLengthForField(localFilter.field);
  const airlineOptions = useMemo(() => {
    const set = new Set<string>();
    for (const a of aircraft) {
      if (a.livery) {
        set.add(a.livery);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [aircraft]);

  const canSave =
    !operatorNeedsValue(localFilter.operator) ||
    (localFilter.field === 'flightTime'
      ? typeof localFilter.value === 'string' &&
        convertTimeToMinutes(localFilter.value) !== null &&
        localFilter.value.length <= maxLength
      : !!localFilter.value &&
        (typeof localFilter.value !== 'string' ||
          localFilter.value.length <= maxLength));

  const getPlaceholder = (field: FilterField): string => {
    if (field === 'flightTime') {
      return 'HH:MM (e.g., 01:30)';
    }
    if (field === 'departureIcao' || field === 'arrivalIcao') {
      return 'e.g., KEWR';
    }
    if (field === 'airline') {
      return 'e.g., Air France';
    }
    return 'Enter value...';
  };

  const renderValueInput = () => {
    switch (localFilter.field) {
      case 'aircraftId':
        return (
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
        );
      case 'airline':
        return (
          <Select
            value={localFilter.value?.toString() || ''}
            onValueChange={(value) => updateFilter({ value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select airline..." />
            </SelectTrigger>
            <SelectContent>
              {airlineOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return (
          <Input
            type="text"
            pattern="^([0-9]{1,2}):([0-5][0-9])$"
            placeholder={getPlaceholder(localFilter.field)}
            value={
              localFilter.field === 'flightTime'
                ? typeof localFilter.value === 'number'
                  ? convertMinutesToTime(localFilter.value)
                  : (localFilter.value as string | number | undefined) || ''
                : localFilter.value?.toString() || ''
            }
            onChange={(e) => {
              let value = e.target.value;
              if (value.length > maxLength) {
                value = value.slice(0, maxLength);
              }
              if (localFilter.field === 'flightTime') {
                updateFilter({ value }); // store raw string
              } else {
                updateFilter({ value });
              }
            }}
            maxLength={maxLength}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Field</label>
          <Select
            value={localFilter.field}
            onValueChange={(value: FilterField) =>
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

        {operatorNeedsValue(localFilter.operator) && (
          <div>
            <label className="text-sm font-medium mb-1 block">Value</label>
            {renderValueInput()}
          </div>
        )}
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
