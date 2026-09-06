/**
 * Shared types for automated PIREP verification.
 *
 * This module is imported by client components, so it must stay free of any
 * database or server-only imports. The engine itself lives in
 * `domains/pireps/verification`.
 */

export const VERIFICATION_VERSION = 1;

export const VERIFICATION_CHECK_IDS = [
  'pilot-standing',
  'route',
  'flight-number',
  'flight-time',
  'route-aircraft',
  'type-rating',
  'rank-flight-time',
  'duplicate',
] as const;

export type VerificationCheckId = (typeof VERIFICATION_CHECK_IDS)[number];

/**
 * `skipped` means the check does not apply to this PIREP (for example type
 * ratings on a casual flight). It never blocks auto-approval, but it is
 * rendered so a reviewer can see what was not evaluated rather than assuming
 * a silent pass.
 */
export type VerificationCheckStatus = 'passed' | 'failed' | 'skipped';

export interface VerificationCheck {
  id: VerificationCheckId;
  status: VerificationCheckStatus;
  message: string;
}

export const AUTO_APPROVAL_MODES = ['off', 'advisory', 'enabled'] as const;
export type AutoApprovalMode = (typeof AUTO_APPROVAL_MODES)[number];

export interface PirepVerification {
  version: number;
  evaluatedAt: string;
  mode: AutoApprovalMode;
  /** True when every applicable check passed. */
  passed: boolean;
  checks: VerificationCheck[];
}

export const VERIFICATION_CHECK_LABELS: Record<VerificationCheckId, string> = {
  'pilot-standing': 'Pilot standing',
  route: 'Route',
  'flight-number': 'Flight number',
  'flight-time': 'Flight time',
  'route-aircraft': 'Aircraft on route',
  'type-rating': 'Type rating',
  'rank-flight-time': 'Rank flight time limit',
  duplicate: 'Duplicate check',
};

export const AUTO_APPROVAL_MODE_LABELS: Record<AutoApprovalMode, string> = {
  off: 'Disabled',
  advisory: 'Advisory only',
  enabled: 'Enabled',
};

const CHECK_ID_SET = new Set<string>(VERIFICATION_CHECK_IDS);
const CHECK_STATUSES = new Set<string>(['passed', 'failed', 'skipped']);
const MODES = new Set<string>(AUTO_APPROVAL_MODES);

function isVerificationCheck(value: unknown): value is VerificationCheck {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    CHECK_ID_SET.has(candidate.id) &&
    typeof candidate.status === 'string' &&
    CHECK_STATUSES.has(candidate.status) &&
    typeof candidate.message === 'string'
  );
}

/**
 * Parses the JSON stored on `pireps.verification_results`.
 *
 * Returns null for PIREPs filed before automated checks existed, and for any
 * payload that cannot be trusted. Unknown check ids are dropped rather than
 * rendered, so removing a check does not break historic PIREPs.
 */
export function parseVerificationResults(
  raw: string | null | undefined
): PirepVerification | null {
  if (!raw) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  const candidate = parsed as Record<string, unknown>;

  if (!Array.isArray(candidate.checks)) {
    return null;
  }

  const checks = candidate.checks.filter(isVerificationCheck);
  const mode =
    typeof candidate.mode === 'string' && MODES.has(candidate.mode)
      ? (candidate.mode as AutoApprovalMode)
      : 'off';

  return {
    version:
      typeof candidate.version === 'number'
        ? candidate.version
        : VERIFICATION_VERSION,
    evaluatedAt:
      typeof candidate.evaluatedAt === 'string' ? candidate.evaluatedAt : '',
    mode,
    passed: candidate.passed === true,
    checks,
  };
}

export function summarizeVerification(verification: PirepVerification): {
  failed: number;
  passed: number;
  skipped: number;
  applicable: number;
} {
  let failed = 0;
  let passed = 0;
  let skipped = 0;

  for (const check of verification.checks) {
    if (check.status === 'failed') {
      failed += 1;
    } else if (check.status === 'passed') {
      passed += 1;
    } else {
      skipped += 1;
    }
  }

  return { failed, passed, skipped, applicable: failed + passed };
}
