'use client';

import { MoreHorizontal, Tags, Trash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { parseAsInteger, useQueryState } from 'nuqs';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  deleteBulkRanksAction,
  deleteRankAction,
} from '@/actions/ranks/delete-rank';
import { getRankAircraftAction } from '@/actions/ranks/get-rank-aircraft';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataPagination } from '@/components/ui/data-pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResponsiveDialogFooter } from '@/components/ui/responsive-dialog-footer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useResponsiveDialog } from '@/hooks/use-responsive-dialog';
import { useSession } from '@/lib/auth-client';
import { isOwnerOrAdmin } from '@/lib/roles';

import EditRankDialog from './edit-rank-dialog';

interface Rank {
  id: string;
  name: string;
  minimumFlightTime: number;
  maximumFlightTime?: number | null;
  typeRatingSlots: number;
  createdAt: string | Date;
}

interface RanksTableProps {
  ranks: Rank[];
  total: number;
  limit?: number;
  onEdit?: (id: string) => void;
}

export function RanksTable({ ranks, total, limit = 10 }: RanksTableProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const canBulkDelete = isOwnerOrAdmin(session?.user?.role ?? null);
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
  const { dialogStyles } = useResponsiveDialog({
    maxWidth: 'sm:max-w-[420px]',
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rankToDelete, setRankToDelete] = useState<Rank | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [rankToEdit, setRankToEdit] = useState<Rank | null>(null);
  const [editAircraftIds, setEditAircraftIds] = useState<string[]>([]);
  const [editAllowAllAircraft, setEditAllowAllAircraft] = useState(false);
  const [selectedRankIds, setSelectedRankIds] = useState<Set<string>>(
    new Set()
  );
  const [isBulkDelete, setIsBulkDelete] = useState(false);

  const { execute: deleteRank, isExecuting } = useAction(deleteRankAction, {
    onSuccess: ({ data }) => {
      toast.success(data?.message || 'Rank deleted successfully');
      setDeleteDialogOpen(false);
      setRankToDelete(null);
      setSelectedRankIds(new Set());
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to delete rank');
    },
  });

  const { execute: deleteBulkRanks, isExecuting: isBulkDeleting } = useAction(
    deleteBulkRanksAction,
    {
      onSuccess: ({ data }) => {
        toast.success(data?.message || 'Ranks deleted successfully');
        setDeleteDialogOpen(false);
        setSelectedRankIds(new Set());
        setIsBulkDelete(false);
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Failed to delete ranks');
      },
    }
  );

  const { execute: fetchRankAircraft } = useAction(getRankAircraftAction, {
    onSuccess: ({ data }) => {
      if (
        data?.success &&
        'aircraftIds' in data &&
        'allowAllAircraft' in data
      ) {
        setEditAircraftIds(data.aircraftIds);
        setEditAllowAllAircraft(data.allowAllAircraft);
        setEditDialogOpen(true);
      } else {
        toast.error('Failed to fetch rank aircraft');
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to fetch rank aircraft');
    },
  });

  const handleDeleteClick = (rank: Rank) => {
    setRankToDelete(rank);
    setIsBulkDelete(false);
    setDeleteDialogOpen(true);
  };

  const handleBulkDeleteClick = () => {
    if (selectedRankIds.size === 0) {
      return;
    }
    setIsBulkDelete(true);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (isBulkDelete) {
      deleteBulkRanks({ ids: Array.from(selectedRankIds) });
    } else if (rankToDelete) {
      deleteRank({ id: rankToDelete.id });
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setRankToDelete(null);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRankIds(new Set(ranks.map((r) => r.id)));
    } else {
      setSelectedRankIds(new Set());
    }
  };

  const handleSelectRank = (rankId: string, checked: boolean) => {
    const newSelected = new Set(selectedRankIds);
    if (checked) {
      newSelected.add(rankId);
    } else {
      newSelected.delete(rankId);
    }
    setSelectedRankIds(newSelected);
  };

  const allSelected =
    ranks.length > 0 && ranks.every((r) => selectedRankIds.has(r.id));
  const someSelected = ranks.some((r) => selectedRankIds.has(r.id));

  const handleEditClick = (rank: Rank) => {
    setRankToEdit({ ...rank });
    fetchRankAircraft({ rankId: rank.id });
  };

  const totalPages = Math.ceil(total / limit);

  const handlePageChange = async (newPage: number) => {
    await setPage(newPage);
    router.refresh();
  };

  return (
    <>
      {canBulkDelete && someSelected && (
        <div className="mb-4 flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground">
              {selectedRankIds.size} rank{selectedRankIds.size === 1 ? '' : 's'}{' '}
              selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDeleteClick}
              disabled={isExecuting || isBulkDeleting}
              className="flex w-full items-center justify-center gap-2 sm:w-auto"
            >
              <Trash className="h-4 w-4" />
              Delete All
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-border bg-panel shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              {canBulkDelete && (
                <TableHead className="w-[50px] bg-muted/50">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    disabled={isExecuting || isBulkDeleting}
                  />
                </TableHead>
              )}
              <TableHead className="bg-muted/50 font-semibold text-foreground">
                Rank Name
              </TableHead>
              <TableHead className="bg-muted/50 font-semibold text-foreground">
                Minimum Career Flight Time
              </TableHead>
              <TableHead className="bg-muted/50 font-semibold text-foreground">
                Type Rating Slots
              </TableHead>
              <TableHead className="bg-muted/50 font-semibold text-foreground">
                Date Added
              </TableHead>
              <TableHead className="w-[50px] bg-muted/50" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranks.length === 0 ? (
              <TableRow>
                <TableCell
                  className="px-6 py-12 text-center text-foreground"
                  colSpan={6}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Tags className="h-6 w-6 text-foreground" />
                    <p>No ranks found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              ranks.map((rank) => (
                <TableRow
                  className="transition-colors hover:bg-muted/30"
                  key={rank.id}
                >
                  {canBulkDelete && (
                    <TableCell>
                      <Checkbox
                        checked={selectedRankIds.has(rank.id)}
                        onCheckedChange={(checked) =>
                          handleSelectRank(rank.id, checked as boolean)
                        }
                        disabled={isExecuting || isBulkDeleting}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium text-foreground">
                    {rank.name}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {rank.minimumFlightTime}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {rank.typeRatingSlots}
                  </TableCell>
                  <TableCell className="text-foreground">
                    {new Date(rank.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
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
                        <DropdownMenuItem
                          disabled={isExecuting}
                          onClick={() => handleEditClick(rank)}
                        >
                          Edit Rank
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={isExecuting}
                          onClick={() => handleDeleteClick(rank)}
                        >
                          Delete Rank
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <DialogContent
          className={dialogStyles.className}
          style={dialogStyles.style}
          showCloseButton
          transitionFrom="top-right"
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Delete {isBulkDelete ? 'Ranks' : 'Rank'}
            </DialogTitle>
            <DialogDescription className="text-foreground">
              {isBulkDelete
                ? `Are you sure you want to delete ${selectedRankIds.size} rank${selectedRankIds.size === 1 ? '' : 's'}? This action cannot be undone.`
                : `Are you sure you want to delete "${rankToDelete?.name}"? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <ResponsiveDialogFooter
            primaryButton={{
              label: isExecuting || isBulkDeleting ? 'Deleting...' : 'Delete',
              onClick: handleConfirmDelete,
              disabled: isExecuting || isBulkDeleting,
              loading: isExecuting || isBulkDeleting,
              loadingLabel: 'Deleting...',
              className:
                'bg-destructive text-destructive-foreground hover:bg-destructive/90',
            }}
            secondaryButton={{
              label: 'Cancel',
              onClick: handleCancelDelete,
              disabled: isExecuting || isBulkDeleting,
            }}
          />
        </DialogContent>
      </Dialog>

      {rankToEdit && (
        <EditRankDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          rank={{
            ...rankToEdit,
            maximumFlightTime: rankToEdit.maximumFlightTime ?? null,
            allowAllAircraft: editAllowAllAircraft,
            aircraftIds: editAircraftIds,
          }}
        />
      )}

      {totalPages > 1 && (
        <DataPagination
          page={page}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={limit}
          itemLabelPlural="ranks"
          onPageChange={handlePageChange}
          className="mt-4"
        />
      )}
    </>
  );
}
