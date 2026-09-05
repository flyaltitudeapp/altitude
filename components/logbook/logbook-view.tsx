'use client';

import Link from 'next/link';
import { useAction } from 'next-safe-action/hooks';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchUserPirepsAction } from '@/actions/logbook/search-pireps';
import { ActiveFilters } from '@/components/logbook/active-filters';
import { PirepFiltersBar } from '@/components/logbook/pirep-filters-bar';
import { PirepCategoryBadge } from '@/components/pireps/pirep-category-badge';
import { Button } from '@/components/ui/button';
import { DataPagination } from '@/components/ui/data-pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PirepFilterCondition } from '@/db/queries/pireps';
import type { Pirep } from '@/db/schema';
import { formatHoursMinutes } from '@/lib/utils';

interface LogbookViewProps {
  flights: Pirep[];
  total: number;
  limit?: number;
  aircraft: { id: string; name: string; livery?: string }[];
  filters: PirepFilterCondition[];
}

function usePirepFilterParams() {
  const [filtersParam, setFiltersParam] = useQueryState(
    'filters',
    parseAsString
  );

  const filters = useMemo(() => {
    if (!filtersParam) {
      return [];
    }
    try {
      return JSON.parse(filtersParam) as PirepFilterCondition[];
    } catch {
      return [];
    }
  }, [filtersParam]);

  const setFilters = useCallback(
    async (newFilters: PirepFilterCondition[]) => {
      if (newFilters.length === 0) {
        await setFiltersParam(null);
      } else {
        await setFiltersParam(JSON.stringify(newFilters));
      }
    },
    [setFiltersParam]
  );

  return { filters, setFilters };
}

export function LogbookView({
  flights,
  total,
  limit = 10,
  aircraft,
}: LogbookViewProps) {
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));

  const { filters: filtersFromParams, setFilters } = usePirepFilterParams();

  const [flightsState, setFlightsState] = useState<Pirep[]>(flights);
  const [totalState, setTotalState] = useState(total);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [editingFilter, setEditingFilter] =
    useState<PirepFilterCondition | null>(null);

  const { execute: fetchPireps, isExecuting } = useAction(
    fetchUserPirepsAction,
    {
      onSuccess: ({ data }) => {
        setFlightsState(data?.pireps || []);
        setTotalState(data?.total || 0);
        setIsInitialLoad(false);
      },
    }
  );

  useEffect(() => {
    fetchPireps({ page, limit, filters: filtersFromParams });
  }, [page, filtersFromParams, fetchPireps, limit]);

  const handleFiltersChange = async (filters: PirepFilterCondition[]) => {
    await Promise.all([setFilters(filters), setPage(1)]);
  };

  const handlePageChange = async (newPage: number) => {
    await setPage(newPage);
    // fetch triggered automatically
  };

  const handleEditFilter = (filter: PirepFilterCondition) => {
    setEditingFilter(filter);
  };

  const totalPages = Math.ceil(totalState / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1 w-full md:w-auto">
          <h3 className="font-medium text-2xl md:text-3xl text-foreground break-normal">
            Logbook
          </h3>
          <p className="text-muted-foreground">
            View and filter your complete flight history and PIREPs
          </p>
        </div>
        <div className="flex-shrink-0">
          <PirepFiltersBar
            aircraft={aircraft}
            currentFilters={filtersFromParams}
            isExecuting={isExecuting && !isInitialLoad}
            onFiltersChange={handleFiltersChange}
            showFilterButtonOnly={true}
            editingFilter={editingFilter}
            onEditFilter={handleEditFilter}
            onClearEditingFilter={() => setEditingFilter(null)}
          />
        </div>
      </div>

      <ActiveFilters
        aircraft={aircraft}
        currentFilters={filtersFromParams}
        isExecuting={isExecuting && !isInitialLoad}
        onFiltersChange={handleFiltersChange}
        onEditFilter={handleEditFilter}
      />

      <section className="space-y-4">
        <div className="overflow-hidden rounded-md border border-border bg-panel shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-muted/50 font-semibold text-foreground">
                  Flight Number
                </TableHead>
                <TableHead className="bg-muted/50 font-semibold text-foreground">
                  Route
                </TableHead>
                <TableHead className="bg-muted/50 font-semibold text-foreground">
                  Flight Time
                </TableHead>
                <TableHead className="bg-muted/50 font-semibold text-foreground">
                  Category
                </TableHead>
                <TableHead className="bg-muted/50 font-semibold text-foreground">
                  Status
                </TableHead>
                <TableHead className="w-[50px] bg-muted/50" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {flightsState.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="px-6 py-12 text-center text-foreground"
                    colSpan={6}
                  >
                    <div className="flex flex-col items-center gap-2">
                      {/* TODO: Add a plane icon from phospor icons */}
                      <img
                        src="/plane-icon.svg"
                        alt="Plane icon"
                        className="h-6 w-6 opacity-50"
                        style={{
                          filter: 'brightness(0) saturate(100%) invert(1)',
                        }}
                      />
                      <p>No flights logged</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                flightsState.map((flight) => {
                  return (
                    <TableRow
                      className="transition-colors hover:bg-muted/30"
                      key={flight.id}
                    >
                      <TableCell className="font-medium text-foreground">
                        {flight.flightNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-foreground">
                          <span>{flight.departureIcao}</span>→
                          <span>{flight.arrivalIcao}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {formatHoursMinutes(flight.flightTime)}
                      </TableCell>
                      <TableCell>
                        <PirepCategoryBadge category={flight.category} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={flight.status} />
                      </TableCell>
                      <TableCell>
                        <Button size="sm" asChild>
                          <Link href={`/logbook/${flight.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-end">
            <DataPagination
              page={page}
              totalPages={totalPages}
              totalItems={totalState}
              itemsPerPage={limit}
              itemLabelPlural="flights"
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </section>
    </div>
  );
}
