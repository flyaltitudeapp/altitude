import { notFound, redirect } from 'next/navigation';

import { PirepDetails } from '@/components/logbook/pirep-details';
import { getAirportInfoByIcao, getPirepById } from '@/db/queries';
import { getAllowedAircraftForRank } from '@/db/queries/aircraft';
import { getAirline } from '@/db/queries/airline';
import { getMultipliers } from '@/db/queries/multipliers';
import { getUserRank } from '@/db/queries/ranks';
import { getCareerFlightTimeForUser } from '@/db/queries/users';
import { authCheck } from '@/lib/auth-check';
import { parseRolesField } from '@/lib/roles';

export default async function PirepDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await authCheck();

  const { id } = await params;
  const pirepData = await getPirepById(id);

  if (!pirepData) {
    // If the pirep no longer exists (e.g., after being deleted), redirect to the logbook
    redirect('/logbook');
  }

  if (pirepData.pirep.userId !== session.user.id) {
    notFound();
  }

  const { pirep, aircraft, multiplier } = pirepData;

  // Career flight time drives rank, which determines allowed aircraft.
  const userCareerFlightTime = await getCareerFlightTimeForUser(
    session.user.id
  );
  const userRank = await getUserRank(userCareerFlightTime);

  // Get additional data for editing functionality
  const [departureInfo, arrivalInfo, aircraftList, multipliersList, airline] =
    await Promise.all([
      getAirportInfoByIcao(pirep.departureIcao),
      getAirportInfoByIcao(pirep.arrivalIcao),
      // Get aircraft based on user's rank - only allowed aircraft for this user
      userRank ? getAllowedAircraftForRank(userRank.id) : [],
      getMultipliers(),
      getAirline(),
    ]);

  // User can only edit their own PIREPs when they are in pending status
  const isEditable = pirep.status === 'pending';

  // Parse user roles for delete permission check
  const userRoles = parseRolesField(session.user.role);

  return (
    <PirepDetails
      pirep={pirep}
      aircraft={aircraft}
      multiplier={multiplier}
      isEditable={isEditable}
      aircraftList={aircraftList.map((a) => ({
        id: a.id,
        name: a.name,
        livery: a.livery || '',
      }))}
      multipliersList={multipliersList.map((m) => ({
        id: m.id,
        name: m.name,
        value: m.value,
      }))}
      airline={airline}
      backHref="/logbook"
      backLabel="Back to Logbook"
      departureName={departureInfo?.name ?? undefined}
      arrivalName={arrivalInfo?.name ?? undefined}
      departureCountry={departureInfo?.country ?? undefined}
      arrivalCountry={arrivalInfo?.country ?? undefined}
      currentUserId={session.user.id}
      userRoles={userRoles}
    />
  );
}
