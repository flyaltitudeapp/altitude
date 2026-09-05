import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PageLayout } from '@/components/page-layout';
import { Button } from '@/components/ui/button';
import { BanUserDialog } from '@/components/users/dialogs/ban-user-dialog';
import { KickUserDialog } from '@/components/users/dialogs/kick-user-dialog';
import { ResetPasswordDialog } from '@/components/users/dialogs/reset-password-dialog';
import { ReviewApplicationDialog } from '@/components/users/dialogs/review-application-dialog';
import { TransferFlightTimeDialog } from '@/components/users/dialogs/transfer-flight-time-dialog';
import { TransferOwnershipDialog } from '@/components/users/dialogs/transfer-ownership-dialog';
import { UserFlights } from '@/components/users/user-flights';
import { UserProfile } from '@/components/users/user-profile';
import { UserRoles } from '@/components/users/user-roles';
import { UserStats } from '@/components/users/user-stats';
import { UserTyperatings } from '@/components/users/user-typeratings';
import {
  getAirline,
  getAllTyperatings,
  getAvailableTyperatingSlots,
  getCareerFlightTimeForUser,
  getCareerPirepCountForUser,
  getFlightTimeForUser,
  getUserById,
  getUserLastFlights,
  getUserPireps,
  getUserRank,
  getUserTyperatings,
} from '@/db/queries';
import { getCurrentUserRoles, requireRole } from '@/lib/auth-check';
import { parseRolesField } from '@/lib/roles';

export function generateMetadata(): Metadata {
  return {
    title: 'User Details - Admin',
  };
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole(['users']);

  const { id } = await params;
  const [user, airline, currentUserRoles] = await Promise.all([
    getUserById(id),
    getAirline(),
    getCurrentUserRoles(),
  ]);

  if (!user) {
    redirect('/admin/users');
  }

  const [
    pirepCountResult,
    calculatedFlightTime,
    careerFlightTime,
    careerPirepCountResult,
    userFlights,
  ] = await Promise.all([
    getUserPireps(user.id, 1, 1),
    getFlightTimeForUser(user.id),
    getCareerFlightTimeForUser(user.id),
    getCareerPirepCountForUser(user.id),
    getUserLastFlights(user.id),
  ]);

  const { total: pirepCount } = pirepCountResult;
  const { careerFlights: careerPirepCount } = careerPirepCountResult;

  const lastPirepDate = userFlights.length > 0 ? userFlights[0].date : null;

  const roles = parseRolesField(user.role);

  const isCurrentUserAdmin = currentUserRoles.includes('admin');
  const isCurrentUserOwner = currentUserRoles.includes('owner');
  const isCurrentUserUsersRole = currentUserRoles.includes('users');
  const isCurrentUserSuperuser = isCurrentUserAdmin || isCurrentUserOwner;
  const isTargetUserAdmin = roles.includes('admin');
  const isTargetUserUsersRole = roles.includes('users');
  const isTargetUserOwner = roles.includes('owner');
  const isSameUser = session.user.id === user.id;
  const isTargetUserStaff =
    roles.length > 0 || isTargetUserAdmin || isTargetUserOwner;

  const canPerformActions =
    !isSameUser &&
    (isCurrentUserSuperuser ||
      (isCurrentUserUsersRole && !isTargetUserAdmin && !isTargetUserUsersRole));

  const canKickOrBan =
    canPerformActions &&
    !isTargetUserOwner &&
    // Admins cannot kick/ban other admins; only owner can
    (!isTargetUserAdmin || isCurrentUserOwner);

  const canManageRoles =
    isCurrentUserSuperuser ||
    (isCurrentUserUsersRole &&
      (isSameUser || (!isTargetUserAdmin && !isTargetUserUsersRole)));

  // Only the current owner can transfer ownership
  const canTransferOwnership = isCurrentUserOwner && !isSameUser;

  // No one can reset the owner's password
  const canResetPassword = canPerformActions && !isTargetUserOwner;

  const userRank = await getUserRank(careerFlightTime);

  const [heldTyperatings, allTyperatings, availableTyperatingSlots] =
    await Promise.all([
      getUserTyperatings(user.id),
      getAllTyperatings(),
      getAvailableTyperatingSlots(user.id),
    ]);

  return (
    <PageLayout className="space-y-6">
      <Button asChild className="mb-4" size="sm" variant="outline">
        <Link href="/admin/users">
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
      </Button>

      <div className="space-y-6">
        <UserProfile
          user={user}
          canManageRoles={canManageRoles}
          rankName={userRank?.name ?? null}
        />

        <UserStats
          user={user}
          pirepCount={pirepCount}
          careerPirepCount={careerPirepCount}
          flightTime={calculatedFlightTime}
          careerFlightTime={careerFlightTime}
          lastPirepDate={lastPirepDate}
          airlinePrefix={airline?.callsign || ''}
          callsignMinRange={airline?.callsignMinRange || 1}
          callsignMaxRange={airline?.callsignMaxRange || 999}
          canEdit={canPerformActions || isSameUser}
          enforceCallsignRange={!isTargetUserStaff}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UserFlights
            flights={userFlights}
            userName={user.name || 'Unnamed User'}
          />
          <UserRoles
            user={user}
            canManageRoles={canManageRoles}
            isCurrentUserOwner={isCurrentUserOwner}
          />
        </div>

        <UserTyperatings
          userId={user.id}
          heldTyperatings={heldTyperatings}
          allTyperatings={allTyperatings}
          availableSlots={availableTyperatingSlots}
          totalSlots={userRank?.typeRatingSlots ?? 0}
          canManage={canManageRoles}
        />

        {canPerformActions && (
          <div className="rounded-lg border border-input bg-panel p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">User Actions</h2>
              <p className="text-sm text-muted-foreground">
                Manage user account status and perform destructive actions
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {!user.verified && canManageRoles && (
                <ReviewApplicationDialog
                  userId={user.id}
                  userName={user.name || 'Unnamed User'}
                />
              )}
              <TransferFlightTimeDialog
                targetUserId={user.id}
                targetUserName={user.name || 'Unnamed User'}
              />
              {canTransferOwnership && (
                <TransferOwnershipDialog
                  userId={user.id}
                  userName={user.name || 'Unnamed User'}
                  canTransfer={canTransferOwnership}
                />
              )}
              <BanUserDialog
                userId={user.id}
                userName={user.name || 'Unnamed User'}
                isCurrentlyBanned={user.banned}
                currentBanReason={user.bannedReason}
                banExpires={user.banExpires ? new Date(user.banExpires) : null}
                canBan={canKickOrBan}
              />
              <KickUserDialog
                userId={user.id}
                userName={user.name || 'Unnamed User'}
                canKick={canKickOrBan}
              />
              <ResetPasswordDialog
                userId={user.id}
                userName={user.name || 'Unnamed User'}
                canResetPassword={canResetPassword}
              />
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
