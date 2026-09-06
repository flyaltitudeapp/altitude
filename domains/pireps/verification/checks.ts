import type {
  VerificationCheck,
  VerificationCheckId,
} from '@/lib/pireps/verification';
import { formatHoursMinutes } from '@/lib/utils';

import type { VerificationContext } from './context';

type CheckRunner = (context: VerificationContext) => VerificationCheck;

function passed(id: VerificationCheckId, message: string): VerificationCheck {
  return { id, status: 'passed', message };
}

function failed(id: VerificationCheckId, message: string): VerificationCheck {
  return { id, status: 'failed', message };
}

function skipped(id: VerificationCheckId, message: string): VerificationCheck {
  return { id, status: 'skipped', message };
}

const checkPilotStanding: CheckRunner = ({
  pilot,
  onLeave,
  approvedPirepCount,
  config,
}) => {
  if (pilot.banned) {
    return failed('pilot-standing', 'Pilot is banned');
  }

  if (!pilot.verified) {
    return failed('pilot-standing', 'Pilot account is not verified');
  }

  if (onLeave) {
    return failed(
      'pilot-standing',
      'Pilot was on approved leave on the flight date'
    );
  }

  if (approvedPirepCount < config.minPireps) {
    return failed(
      'pilot-standing',
      `Pilot has ${approvedPirepCount} approved ${
        approvedPirepCount === 1 ? 'PIREP' : 'PIREPs'
      }, ${config.minPireps} required before auto-approval applies`
    );
  }

  return passed('pilot-standing', 'Pilot is in good standing');
};

const checkRoute: CheckRunner = ({ pirep, routesForPair }) => {
  const pair = `${pirep.departureIcao} → ${pirep.arrivalIcao}`;

  if (routesForPair.length === 0) {
    return failed('route', `No published route for ${pair}`);
  }

  if (routesForPair.length === 1) {
    return passed('route', `${pair} is a published route`);
  }

  return passed(
    'route',
    `${pair} is published on ${routesForPair.length} routes`
  );
};

const checkFlightNumber: CheckRunner = ({
  pirep,
  routesForPair,
  routesForFlightNumber,
}) => {
  const filed = pirep.flightNumber.trim().toUpperCase();
  const isOnPair = routesForPair.some((route) =>
    route.flightNumbers.some((number) => number.toUpperCase() === filed)
  );

  if (isOnPair) {
    return passed(
      'flight-number',
      `${pirep.flightNumber} is published on this route`
    );
  }

  if (routesForFlightNumber.length > 0) {
    const elsewhere = routesForFlightNumber
      .slice(0, 2)
      .map((route) => `${route.departureIcao} → ${route.arrivalIcao}`)
      .join(', ');

    return failed(
      'flight-number',
      `${pirep.flightNumber} is published on ${elsewhere}, not on ${pirep.departureIcao} → ${pirep.arrivalIcao}`
    );
  }

  return failed(
    'flight-number',
    `${pirep.flightNumber} is not published on any route`
  );
};

const checkFlightTime: CheckRunner = ({
  baseFlightTime,
  matchedRoute,
  config,
}) => {
  if (!matchedRoute) {
    return skipped('flight-time', 'No route matched to compare against');
  }

  const expected = matchedRoute.flightTime;

  if (expected <= 0) {
    return skipped('flight-time', 'Route has no published flight time');
  }

  const deviation = Math.round(((baseFlightTime - expected) / expected) * 100);
  const filed = formatHoursMinutes(baseFlightTime);
  const standard = formatHoursMinutes(expected);

  if (Math.abs(deviation) > config.tolerancePercent) {
    return failed(
      'flight-time',
      `${filed} filed, route standard ${standard} (${
        deviation > 0 ? '+' : ''
      }${deviation}%, tolerance ±${config.tolerancePercent}%)`
    );
  }

  return passed(
    'flight-time',
    `${filed} filed, route standard ${standard} (${
      deviation > 0 ? '+' : ''
    }${deviation}%)`
  );
};

const checkRouteAircraft: CheckRunner = ({
  pirep,
  aircraftLabel,
  matchedRoute,
}) => {
  if (!matchedRoute) {
    return skipped('route-aircraft', 'No route matched to compare against');
  }

  if (matchedRoute.aircraftIds.length === 0) {
    return passed('route-aircraft', 'Route has no fleet restriction');
  }

  if (!pirep.aircraftId) {
    return failed('route-aircraft', 'PIREP has no aircraft assigned');
  }

  if (matchedRoute.aircraftIds.includes(pirep.aircraftId)) {
    return passed(
      'route-aircraft',
      `${aircraftLabel} is assigned to this route`
    );
  }

  return failed(
    'route-aircraft',
    `${aircraftLabel} is not assigned to this route`
  );
};

const checkTypeRating: CheckRunner = ({
  pirep,
  aircraftLabel,
  typeratedAircraftIds,
}) => {
  if (pirep.category === 'casual') {
    return skipped('type-rating', 'Not required for casual flights');
  }

  if (!pirep.aircraftId) {
    return failed('type-rating', 'PIREP has no aircraft assigned');
  }

  if (typeratedAircraftIds.includes(pirep.aircraftId)) {
    return passed('type-rating', `Pilot is type rated for ${aircraftLabel}`);
  }

  return failed('type-rating', `Pilot is not type rated for ${aircraftLabel}`);
};

const checkRankFlightTime: CheckRunner = ({ baseFlightTime, rank }) => {
  if (!rank) {
    return skipped('rank-flight-time', 'Pilot has no rank assigned');
  }

  if (!rank.maximumFlightTime) {
    return passed('rank-flight-time', `${rank.name} has no flight time limit`);
  }

  const limit = rank.maximumFlightTime * 60;

  if (baseFlightTime > limit) {
    return failed(
      'rank-flight-time',
      `${formatHoursMinutes(baseFlightTime)} exceeds the ${
        rank.name
      } limit of ${formatHoursMinutes(limit)}`
    );
  }

  return passed(
    'rank-flight-time',
    `Within the ${rank.name} limit of ${formatHoursMinutes(limit)}`
  );
};

const checkDuplicate: CheckRunner = ({ pirep, duplicateOf }) => {
  if (duplicateOf) {
    return failed(
      'duplicate',
      `Matches another PIREP for ${pirep.flightNumber} on the same day`
    );
  }

  return passed('duplicate', 'No matching PIREP on the same day');
};

/**
 * Evaluation order is also display order before failures are hoisted, so it
 * runs roughly in the order a human would review a PIREP.
 */
export const CHECK_RUNNERS: CheckRunner[] = [
  checkPilotStanding,
  checkRoute,
  checkFlightNumber,
  checkFlightTime,
  checkRouteAircraft,
  checkTypeRating,
  checkRankFlightTime,
  checkDuplicate,
];

export function runChecks(context: VerificationContext): VerificationCheck[] {
  return CHECK_RUNNERS.map((runner) => runner(context));
}
