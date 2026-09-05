import Link from 'next/link';

import { PirepCategoryBadge } from '@/components/pireps/pirep-category-badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Pirep } from '@/db/schema';
import { formatHoursMinutes } from '@/lib/utils';

interface FlightLogProps {
  flights: Pirep[];
}

export function FlightsTable({ flights }: FlightLogProps) {
  return (
    <>
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
            {flights.length === 0 ? (
              <TableRow>
                <TableCell
                  className="px-6 py-12 text-center text-foreground"
                  colSpan={6}
                >
                  <div className="flex flex-col items-center gap-2">
                    <p>No flights found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              flights.map((flight) => (
                <TableRow
                  className="transition-colors hover:bg-muted/30"
                  key={flight.id}
                >
                  <TableCell className="font-medium text-foreground">
                    {flight.flightNumber}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-foreground">
                      <span>{flight.departureIcao}</span>
                      <span className="mx-1 text-muted-foreground">→</span>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
