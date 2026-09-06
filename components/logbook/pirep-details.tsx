'use client';

import {
  ArrowLeft,
  Ban,
  Calendar,
  Clock,
  Droplet,
  MessageSquare,
  Navigation,
  Package,
  Plane,
  Trash2,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { ReactNode, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { deletePirepAction } from '@/actions/pireps/delete-pirep';
import { AircraftCard, DetailsCard, RouteCard } from '@/components/logbook';
import { InlineFlightNumberEditor } from '@/components/logbook/inline-flight-number-editor';
import { AutoApprovalChecklist } from '@/components/pireps/auto-approval-checklist';
import { PirepEventsDialog } from '@/components/pireps/dialogs/pirep-events-dialog';
import { PirepCategoryBadge } from '@/components/pireps/pirep-category-badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ResponsiveDialogFooter } from '@/components/ui/responsive-dialog-footer';
import { StatusBadge } from '@/components/ui/status-badge';
import type { Aircraft, Airline, Multiplier, Pirep, User } from '@/db/schema';
import { useResponsiveDialog } from '@/hooks/use-responsive-dialog';
import { extractErrorMessage } from '@/lib/error-handler';
import { parseVerificationResults } from '@/lib/pireps/verification';
import { cn, formatFullCallsign } from '@/lib/utils';

interface PirepDetailSharedProps {
  pirep: Pirep;
  aircraft: Aircraft | null;
  multiplier: Multiplier | null;
  user?: User;
  isAdmin?: boolean;
  isEditable?: boolean;
  adminActionButtons?: ReactNode;
  backHref: string;
  backLabel: string;
  aircraftList?: { id: string; name: string; livery: string }[];
  multipliersList?: { id: string; name: string; value: number }[];
  departureName?: string | null;
  arrivalName?: string | null;
  departureCountry?: string;
  arrivalCountry?: string;
  airline?: Airline;
  canDelete?: boolean;
  currentUserId?: string;
  userRoles?: string[];
}

export function PirepDetails({
  pirep,
  aircraft,
  multiplier,
  user,
  isAdmin = false,
  isEditable = false,
  adminActionButtons,
  backHref,
  backLabel,
  aircraftList = [],
  multipliersList = [],
  departureName,
  arrivalName,
  departureCountry,
  arrivalCountry,
  airline,
  canDelete = false,
  currentUserId,
  userRoles = [],
}: PirepDetailSharedProps) {
  const router = useRouter();
  const { dialogStyles } = useResponsiveDialog();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  const verification = useMemo(
    () => parseVerificationResults(pirep.verificationResults),
    [pirep.verificationResults]
  );

  const canUserDelete = () => {
    if (!currentUserId) {
      return false;
    }

    if (pirep.status === 'pending') {
      // For pending pireps: either own pirep OR have pireps role
      const isOwnPirep = pirep.userId === currentUserId;
      const hasPirepsRole =
        userRoles.includes('pireps') ||
        userRoles.includes('admin') ||
        userRoles.includes('owner');
      return isOwnPirep || hasPirepsRole;
    } else {
      // For approved/denied pireps: only users with pireps role
      return (
        userRoles.includes('pireps') ||
        userRoles.includes('admin') ||
        userRoles.includes('owner')
      );
    }
  };

  const showDeleteButton = canDelete || canUserDelete();

  const { execute: deletePirep, isExecuting } = useAction(deletePirepAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(data.message || 'PIREP deleted successfully');
        setDeleteDialogOpen(false);
        // Let the page component handle redirect by refreshing
        router.refresh();
      } else {
        toast.error('Failed to delete PIREP');
      }
    },
    onError: ({ error }) => {
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
    },
  });

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    deletePirep({ id: pirep.id });
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <Button asChild size="sm" variant="outline">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
        <Button size="sm" onClick={() => setShowHistoryDialog(true)}>
          History
        </Button>
      </div>
      <PirepEventsDialog
        pirepId={pirep.id}
        open={showHistoryDialog}
        onOpenChange={setShowHistoryDialog}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h4 className="text-3xl text-foreground sm:text-4xl flex items-center gap-1 flex-wrap">
              {isAdmin && user && airline && user.callsign ? (
                <>
                  <span className="font-bold">Flight</span>
                  <span className="font-bold">
                    <InlineFlightNumberEditor
                      pirepId={pirep.id}
                      value={pirep.flightNumber}
                      className="mx-1"
                    />
                  </span>
                  <span className="mx-1">-</span>
                  <span>{user.name}</span>
                  <span className="font-mono mx-1">
                    [{formatFullCallsign(airline.callsign, user.callsign)}]
                  </span>
                </>
              ) : (
                <>
                  Flight{' '}
                  {isEditable ? (
                    <InlineFlightNumberEditor
                      pirepId={pirep.id}
                      value={pirep.flightNumber}
                      className="inline-block"
                    />
                  ) : (
                    <span className="font-bold">{pirep.flightNumber}</span>
                  )}
                  {isAdmin && user ? (
                    <>
                      {' '}
                      - <span className="font-bold">{user.name}</span>
                    </>
                  ) : null}
                </>
              )}
            </h4>
            <StatusBadge status={pirep.status} className="text-sm px-3 py-1" />
            <PirepCategoryBadge
              category={pirep.category}
              className="text-sm px-3 py-1"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {showDeleteButton && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteClick}
              disabled={isExecuting}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
          {isAdmin && adminActionButtons && <div>{adminActionButtons}</div>}
        </div>
      </div>

      <div
        className={cn(
          'pt-3 grid gap-2 grid-cols-1',
          // The sidebar column only exists when there is a checklist to put in
          // it, otherwise the pilot view reserves 20rem of empty space.
          isAdmin && 'xl:grid-cols-[minmax(0,1fr)_20rem]'
        )}
      >
        {isAdmin && (
          <AutoApprovalChecklist
            verification={verification}
            autoApproved={pirep.autoApproved}
            verifiedAt={pirep.verifiedAt}
            className="xl:col-start-2 xl:row-start-1"
          />
        )}

        <div
          className={cn(
            'min-w-0 space-y-2',
            isAdmin && 'xl:col-start-1 xl:row-start-1'
          )}
        >
          <div className="grid gap-2 grid-cols-1 lg:grid-cols-2">
            <RouteCard
              departureIcao={pirep.departureIcao}
              arrivalIcao={pirep.arrivalIcao}
              pirepId={isEditable ? pirep.id : undefined}
              isEditable={isEditable}
              className="h-full"
              departureName={departureName ?? undefined}
              arrivalName={arrivalName ?? undefined}
              departureCountry={departureCountry}
              arrivalCountry={arrivalCountry}
              icon={<Navigation className="h-4 w-4" />}
            />
            <AircraftCard
              name={
                isEditable
                  ? aircraft?.name
                    ? aircraft.livery
                      ? `${aircraft.name} (${aircraft.livery})`
                      : aircraft.name
                    : 'Unknown'
                  : aircraft?.name
                    ? aircraft.livery
                      ? `${aircraft.name} (${aircraft.livery})`
                      : aircraft.name
                    : 'Unknown'
              }
              pirepId={isEditable ? pirep.id : undefined}
              isEditable={isEditable}
              aircraftList={aircraftList}
              currentAircraftId={pirep.aircraftId || ''}
              className="h-full"
              icon={<Plane className="h-4 w-4" />}
            />
          </div>

          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            <DetailsCard
              title="Passengers"
              value={
                typeof pirep.passengers === 'number'
                  ? pirep.passengers.toLocaleString('en-US')
                  : '—'
              }
              subtitle="PAX"
              pirepId={isEditable ? pirep.id : undefined}
              isEditable={isEditable}
              field={isEditable ? 'passengers' : undefined}
              className="h-full"
              icon={<Users className="h-4 w-4" />}
            />
            <DetailsCard
              title="Cargo"
              value={
                typeof pirep.cargo === 'number'
                  ? pirep.cargo.toLocaleString('en-US')
                  : '—'
              }
              subtitle="Kilograms"
              pirepId={isEditable ? pirep.id : undefined}
              isEditable={isEditable}
              field={isEditable ? 'cargo' : undefined}
              className="h-full"
              icon={<Package className="h-4 w-4" />}
            />
            <DetailsCard
              title="Fuel Used"
              value={
                typeof pirep.fuelBurned === 'number'
                  ? pirep.fuelBurned.toLocaleString('en-US')
                  : '—'
              }
              subtitle="Kilograms"
              pirepId={isEditable ? pirep.id : undefined}
              isEditable={isEditable}
              field={isEditable ? 'fuelBurned' : undefined}
              className="h-full"
              icon={<Droplet className="h-4 w-4" />}
            />
            <DetailsCard
              title="Flight time"
              value={pirep.flightTime}
              pirepId={isEditable ? pirep.id : undefined}
              isEditable={isEditable}
              field="flightTime"
              currentMultiplierValue={multiplier?.value || 1}
              className="h-full"
              icon={<Clock className="h-4 w-4" />}
            />
            {/* <DetailsCard
          title="Multiplier"
          value={multiplier?.name || 'None'}
          subtitle={multiplier ? `x${multiplier.value}` : 'No Multiplier Added'}
          pirepId={isEditable ? pirep.id : undefined}
          isEditable={isEditable}
          field={isEditable ? 'multiplier' : undefined}
          multipliers={multipliersList}
          currentMultiplierId={pirep.multiplierId || null}
          className="h-full"
          icon={<Zap className="h-4 w-4" />}
        /> */}
            <DetailsCard
              title="Submitted"
              value={pirep.createdAt.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
              subtitle={pirep.createdAt.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              className="h-full"
              icon={<Calendar className="h-4 w-4" />}
            />
          </div>

          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {isEditable ? (
              pirep.comments ? (
                <div className="col-span-1 sm:col-span-2 xl:col-span-4">
                  <DetailsCard
                    title="Comments"
                    value={pirep.comments}
                    pirepId={pirep.id}
                    isEditable={true}
                    field="comments"
                    className="h-full"
                    icon={<MessageSquare className="h-4 w-4" />}
                  />
                </div>
              ) : (
                <div className="col-span-1 sm:col-span-2 xl:col-span-4">
                  <DetailsCard
                    title="Comments"
                    value="No comments yet. Click to add."
                    pirepId={pirep.id}
                    isEditable={true}
                    field="comments"
                    className="h-full"
                    icon={<MessageSquare className="h-4 w-4" />}
                  />
                </div>
              )
            ) : (
              pirep.comments && (
                <div className="col-span-1 sm:col-span-2 xl:col-span-4">
                  <DetailsCard
                    title="Comments"
                    value={pirep.comments}
                    className="h-full"
                    icon={<MessageSquare className="h-4 w-4" />}
                  />
                </div>
              )
            )}

            {pirep.status === 'denied' && (
              <div className="col-span-1 sm:col-span-2 xl:col-span-4">
                <DetailsCard
                  title="Denied Reason"
                  value={
                    pirep.deniedReason || 'No reason provided. Click to add.'
                  }
                  pirepId={isAdmin ? pirep.id : undefined}
                  isEditable={isAdmin}
                  field={isAdmin ? 'deniedReason' : undefined}
                  className="h-full"
                  icon={<Ban className="h-4 w-4" />}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <DialogContent
          className={dialogStyles.className}
          style={dialogStyles.style}
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>Delete PIREP</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete Flight {pirep.flightNumber}? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {pirep.status === 'approved' && (
            <div className="mt-4 rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20">
              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Warning:</strong> This is an approved PIREP. Deleting it
                will remove the flight hours from the pilot&apos;s record.
              </span>
            </div>
          )}
          <ResponsiveDialogFooter
            primaryButton={{
              label: isExecuting ? 'Deleting...' : 'Delete',
              onClick: handleConfirmDelete,
              disabled: isExecuting,
              loading: isExecuting,
              loadingLabel: 'Deleting...',
              className:
                'bg-destructive text-destructive-foreground hover:bg-destructive/90',
            }}
            secondaryButton={{
              label: 'Cancel',
              onClick: handleCancelDelete,
              disabled: isExecuting,
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
