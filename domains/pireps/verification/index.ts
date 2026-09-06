import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { type Pirep, pireps } from '@/db/schema';
import {
  type PirepVerification,
  VERIFICATION_VERSION,
} from '@/lib/pireps/verification';

import { updatePirepStatus } from '../update-pirep-status';
import { runChecks } from './checks';
import { buildVerificationContext } from './context';

export interface VerificationOutcome {
  verification: PirepVerification | null;
  autoApproved: boolean;
}

const NOT_VERIFIED: VerificationOutcome = {
  verification: null,
  autoApproved: false,
};

async function loadPirep(pirepId: string): Promise<Pirep | undefined> {
  return db.select().from(pireps).where(eq(pireps.id, pirepId)).get();
}

/**
 * Runs the automated checks for a PIREP and, when the airline has auto-approval
 * enabled and nothing failed, approves it.
 *
 * Results are persisted whether or not the PIREP is approved: a pending PIREP
 * carrying its failed checks is what lets a reviewer jump straight to the
 * problem instead of revalidating the whole flight.
 *
 * Never denies. A failing check only ever leaves the PIREP pending for a human.
 */
export async function verifyPirep(
  pirepId: string
): Promise<VerificationOutcome> {
  const pirep = await loadPirep(pirepId);

  if (!pirep) {
    return NOT_VERIFIED;
  }

  const context = await buildVerificationContext(pirep);

  if (context.config.mode === 'off') {
    return NOT_VERIFIED;
  }

  const checks = runChecks(context);
  const verification: PirepVerification = {
    version: VERIFICATION_VERSION,
    evaluatedAt: new Date().toISOString(),
    mode: context.config.mode,
    passed: checks.every((check) => check.status !== 'failed'),
    checks,
  };

  const shouldApprove =
    verification.passed &&
    context.config.mode === 'enabled' &&
    pirep.status === 'pending';

  await db
    .update(pireps)
    .set({
      verificationResults: JSON.stringify(verification),
      verifiedAt: new Date(),
      // Only ever set, never cleared: that the system once approved this PIREP
      // stays true even if a later re-run against changed routes would fail.
      ...(shouldApprove ? { autoApproved: true } : {}),
      updatedAt: new Date(),
    })
    .where(eq(pireps.id, pirepId));

  if (!shouldApprove) {
    return { verification, autoApproved: false };
  }

  // Routed through the normal status transition so the audit trail and rank-up
  // handling behave exactly as they do for a human approval. A null actor plus
  // the `auto_approved` action is how an automated decision is recorded.
  await updatePirepStatus(pirepId, 'approved', null, null, 'auto_approved');

  return { verification, autoApproved: true };
}

/**
 * Best-effort verification for paths where a failure must not take down the
 * surrounding operation (PIREP creation, edits). Errors are swallowed and the
 * PIREP is simply left pending for manual review.
 */
export async function verifyPirepSafely(
  pirepId: string
): Promise<VerificationOutcome> {
  try {
    return await verifyPirep(pirepId);
  } catch {
    return NOT_VERIFIED;
  }
}

export { runChecks } from './checks';
export { buildVerificationContext } from './context';
