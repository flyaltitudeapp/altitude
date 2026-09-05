'use client';

import { User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { parseAsInteger, useQueryState } from 'nuqs';

import { TyperatingSlotCounter } from '@/components/typeratings/typerating-slot-counter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataPagination } from '@/components/ui/data-pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserAvatar } from '@/components/ui/user-avatar';
import { User } from '@/db/schema';
import { Airline } from '@/db/schema';

interface UsersTableProps {
  airline: Airline;
  users: Array<
    User & { isInactive?: boolean | number; lastFlight?: number | null }
  >;
  total: number;
  limit?: number;
  showTyperatings?: boolean;
  typeratingsByUser?: Record<string, { id: string; name: string }[]>;
  slotTotalsByUser?: Record<string, number>;
}

export function UsersTable({
  airline,
  users,
  total,
  limit = 10,
  showTyperatings = false,
  typeratingsByUser = {},
  slotTotalsByUser = {},
}: UsersTableProps) {
  const router = useRouter();
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));

  const totalPages = Math.ceil(total / limit);

  const handlePageChange = async (newPage: number) => {
    await setPage(newPage);
    router.refresh();
  };

  function getFullCallsign(user: User) {
    if (!user.callsign) {
      return '-';
    }
    const airlinePrefix = airline?.callsign || airline?.name || '';
    return airlinePrefix ? `${airlinePrefix}${user.callsign}` : user.callsign;
  }

  function getStatusLabel(
    user: User & { isInactive?: boolean | number; lastFlight?: number | null }
  ) {
    if (user.banned) {
      return { label: 'Removed', variant: 'destructive' as const };
    }
    if (!user.verified) {
      return { label: 'Pending', variant: 'pending' as const };
    }
    if (!user.lastFlight) {
      return { label: 'No Flights', variant: 'info' as const };
    }
    const inactive = Boolean(user.isInactive);
    if (inactive) {
      return { label: 'Inactive', variant: 'secondary' as const };
    }
    return { label: 'Active', variant: 'approved' as const };
  }

  return (
    <>
      <div className="overflow-hidden rounded-md border border-border bg-panel shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="bg-muted/50 font-semibold text-foreground">
                Name
              </TableHead>
              <TableHead className="bg-muted/50 font-semibold text-foreground">
                Callsign
              </TableHead>
              {showTyperatings ? (
                <TableHead className="bg-muted/50 font-semibold text-foreground">
                  Type Ratings
                </TableHead>
              ) : (
                <>
                  <TableHead className="bg-muted/50 font-semibold text-foreground">
                    Email
                  </TableHead>
                  <TableHead className="bg-muted/50 font-semibold text-foreground">
                    Discord
                  </TableHead>
                  <TableHead className="bg-muted/50 font-semibold text-foreground">
                    Joined
                  </TableHead>
                  <TableHead className="bg-muted/50 font-semibold text-foreground">
                    Status
                  </TableHead>
                </>
              )}
              <TableHead className="w-[50px] bg-muted/50" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  className="px-6 py-12 text-center text-foreground"
                  colSpan={showTyperatings ? 4 : 7}
                >
                  <div className="flex flex-col items-center gap-2">
                    <UserIcon className="h-6 w-6 text-muted-foreground" />
                    <p>No users found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow
                  key={user.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        user={{
                          id: user.id,
                          name: user.name,
                          email: user.email,
                          image: user.image,
                        }}
                        className="h-8 w-8 flex-shrink-0"
                      />
                      <span>{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground">
                    {getFullCallsign(user)}
                  </TableCell>
                  {showTyperatings ? (
                    <TableCell className="text-foreground">
                      {(() => {
                        const trs = typeratingsByUser[user.id] ?? [];
                        const held = trs.length;
                        const totalSlots = slotTotalsByUser[user.id] ?? 0;
                        if (held === 0 && totalSlots === 0) {
                          return (
                            <span className="text-muted-foreground">-</span>
                          );
                        }
                        return (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <TyperatingSlotCounter
                              held={held}
                              total={totalSlots}
                              highlightOverallocation
                            />
                            {trs.map((tr) => (
                              <Badge key={tr.id} variant="secondary">
                                {tr.name}
                              </Badge>
                            ))}
                          </div>
                        );
                      })()}
                    </TableCell>
                  ) : (
                    <>
                      <TableCell className="font-medium text-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {user.discordUsername || '-'}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {new Date(user.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {(() => {
                          const status = getStatusLabel(user);
                          return (
                            <Badge variant={status.variant}>
                              {status.label}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    <Button size="sm" asChild>
                      <Link href={`/admin/users/${user.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <DataPagination
          page={page}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={limit}
          itemLabelPlural="users"
          onPageChange={handlePageChange}
          className="mt-4"
        />
      )}
    </>
  );
}
