'use client';

import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

import { PirepCategoryBadge } from '@/components/pireps/pirep-category-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserAvatar } from '@/components/ui/user-avatar';
import type { Airline, Pirep, User } from '@/db/schema';
import { formatFullCallsign, formatHoursMinutes } from '@/lib/utils';

interface PirepsTableProps {
  pireps: (Pirep & { user: User })[];
  airline: Airline;
  emptyMessage: string;
  isExecuting: boolean;
  onStatusUpdate: (pirep: Pirep, status: 'approved' | 'denied') => void;
  selectedPirepIds?: Set<string>;
  onSelectPirep?: (pirepId: string, checked: boolean) => void;
  allSelected?: boolean;
  onSelectAll?: (checked: boolean) => void;
  showCheckboxes?: boolean;
  canViewUsers?: boolean;
}

export function PirepsTable({
  pireps,
  airline,
  emptyMessage,
  isExecuting,
  onStatusUpdate,
  selectedPirepIds = new Set(),
  onSelectPirep,
  allSelected = false,
  onSelectAll,
  showCheckboxes = true,
  canViewUsers = false,
}: PirepsTableProps) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-panel shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {showCheckboxes && onSelectPirep && (
                <TableHead className="w-[50px] bg-muted/50">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={onSelectAll}
                    disabled={isExecuting}
                  />
                </TableHead>
              )}
              <TableHead className="min-w-[100px] bg-muted/50 font-semibold text-foreground">
                Pilot
              </TableHead>
              <TableHead className="min-w-[120px] bg-muted/50 font-semibold text-foreground">
                Flight Number
              </TableHead>
              <TableHead className="min-w-[140px] bg-muted/50 font-semibold text-foreground">
                Route
              </TableHead>
              <TableHead className="min-w-[100px] bg-muted/50 font-semibold text-foreground">
                Category
              </TableHead>
              <TableHead className="min-w-[100px] bg-muted/50 font-semibold text-foreground">
                Duration
              </TableHead>
              <TableHead className="min-w-[120px] bg-muted/50 font-semibold text-foreground">
                Date
              </TableHead>
              <TableHead className="min-w-[100px] bg-muted/50 font-semibold text-foreground">
                Status
              </TableHead>
              <TableHead className="w-[50px] bg-muted/50" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pireps.length === 0 ? (
              <TableRow>
                <TableCell
                  className="px-6 py-12 text-center text-foreground"
                  colSpan={showCheckboxes && onSelectPirep ? 9 : 8}
                >
                  <div className="flex flex-col items-center gap-2">
                    <p>{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pireps.map((pirep: Pirep & { user: User }) => (
                <TableRow
                  className="transition-colors hover:bg-muted/30"
                  key={pirep.id}
                >
                  {showCheckboxes && onSelectPirep && (
                    <TableCell>
                      <Checkbox
                        checked={selectedPirepIds.has(pirep.id)}
                        onCheckedChange={(checked) =>
                          onSelectPirep(pirep.id, checked as boolean)
                        }
                        disabled={isExecuting}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium font-mono text-foreground">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        user={{
                          id: pirep.user.id,
                          name: pirep.user.name,
                          email: pirep.user.email ?? '',
                          image: pirep.user.image,
                        }}
                        className="h-8 w-8 flex-shrink-0"
                      />
                      <div className="flex items-center gap-2">
                        {canViewUsers ? (
                          <Link
                            href={`/admin/users/${pirep.user.id}`}
                            className="text-foreground hover:underline focus:underline outline-none"
                          >
                            {pirep.user.name}
                          </Link>
                        ) : (
                          <span>{pirep.user.name}</span>
                        )}
                        {airline && pirep.user.callsign && (
                          <span className="rounded bg-muted px-2 py-0.5 text-xs text-foreground">
                            {formatFullCallsign(
                              airline.callsign,
                              pirep.user.callsign.toString()
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium font-mono text-foreground">
                    {pirep.flightNumber}
                  </TableCell>
                  <TableCell className="font-medium font-mono text-foreground">
                    {pirep.departureIcao} → {pirep.arrivalIcao}
                  </TableCell>
                  <TableCell>
                    <PirepCategoryBadge category={pirep.category} />
                  </TableCell>
                  <TableCell className="text-foreground">
                    {formatHoursMinutes(pirep.flightTime)}
                  </TableCell>
                  <TableCell className="text-foreground">
                    {new Date(pirep.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        pirep.status === 'pending'
                          ? 'pending'
                          : pirep.status === 'approved'
                            ? 'approved'
                            : 'denied'
                      }
                    >
                      {pirep.status.charAt(0).toUpperCase() +
                        pirep.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          className="h-8 w-8 p-0 text-foreground"
                          disabled={isExecuting}
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link
                            className="flex items-center"
                            href={`/admin/pireps/${pirep.id}`}
                          >
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        {pirep.status === 'pending' && (
                          <>
                            <DropdownMenuItem
                              disabled={isExecuting}
                              onClick={() => onStatusUpdate(pirep, 'approved')}
                            >
                              Approve PIREP
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={isExecuting}
                              onClick={() => onStatusUpdate(pirep, 'denied')}
                            >
                              Deny PIREP
                            </DropdownMenuItem>
                          </>
                        )}
                        {pirep.status === 'approved' && (
                          <DropdownMenuItem
                            disabled={isExecuting}
                            onClick={() => onStatusUpdate(pirep, 'denied')}
                          >
                            Deny PIREP
                          </DropdownMenuItem>
                        )}
                        {pirep.status === 'denied' && (
                          <DropdownMenuItem
                            disabled={isExecuting}
                            onClick={() => onStatusUpdate(pirep, 'approved')}
                          >
                            Approve PIREP
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
