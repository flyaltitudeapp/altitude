'use client';

import {
  CheckCircle2,
  ChevronDown,
  MinusCircle,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LocalTime } from '@/components/ui/local-time';
import {
  type PirepVerification,
  summarizeVerification,
  VERIFICATION_CHECK_LABELS,
  type VerificationCheck,
  type VerificationCheckStatus,
} from '@/lib/pireps/verification';
import { cn } from '@/lib/utils';

interface AutoApprovalChecklistProps {
  verification: PirepVerification | null;
  autoApproved: boolean;
  verifiedAt: Date | null;
  className?: string;
}

const STATUS_ORDER: Record<VerificationCheckStatus, number> = {
  failed: 0,
  passed: 1,
  skipped: 2,
};

function CheckIcon({ status }: { status: VerificationCheckStatus }) {
  if (status === 'failed') {
    return (
      <XCircle
        className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
        aria-hidden
      />
    );
  }

  if (status === 'passed') {
    return (
      <CheckCircle2
        className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--success)]"
        aria-hidden
      />
    );
  }

  return (
    <MinusCircle
      className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
      aria-hidden
    />
  );
}

function CheckRow({ check }: { check: VerificationCheck }) {
  return (
    <li className="flex items-start gap-2.5">
      <CheckIcon status={check.status} />
      <div className="min-w-0 space-y-0.5">
        <p
          className={cn(
            'text-sm leading-tight',
            check.status === 'skipped'
              ? 'text-muted-foreground'
              : 'text-foreground'
          )}
        >
          {VERIFICATION_CHECK_LABELS[check.id]}
        </p>
        <p className="break-words text-xs leading-snug text-muted-foreground">
          {check.message}
        </p>
      </div>
    </li>
  );
}

function Verdict({
  verification,
  autoApproved,
}: {
  verification: PirepVerification;
  autoApproved: boolean;
}) {
  const { failed, applicable } = summarizeVerification(verification);

  if (autoApproved) {
    return <Badge variant="approved">Auto-approved</Badge>;
  }

  if (failed > 0) {
    return (
      <Badge variant="denied">
        {failed} of {applicable} failed
      </Badge>
    );
  }

  if (verification.mode === 'advisory') {
    return <Badge variant="pending">Passed — advisory only</Badge>;
  }

  return <Badge variant="pending">All checks passed</Badge>;
}

/**
 * Admin-only summary of the automated checks behind an auto-approval decision.
 *
 * The point is the failures: a reviewer can go straight to what tripped the
 * PIREP instead of revalidating the whole flight, so failed checks sort to the
 * top and carry the filed-versus-expected detail inline.
 *
 * Sits in the sidebar from xl up. Below that it moves above the flight details
 * and collapses, expanded by default whenever something needs attention.
 */
export function AutoApprovalChecklist({
  verification,
  autoApproved,
  verifiedAt,
  className,
}: AutoApprovalChecklistProps) {
  const failedCount = verification
    ? summarizeVerification(verification).failed
    : 0;
  const needsAttention = !verification || failedCount > 0;
  const [open, setOpen] = useState(needsAttention);

  const sortedChecks = verification
    ? [...verification.checks].sort(
        (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      )
    : [];

  return (
    <Card
      className={cn(
        'rounded-[var(--radius-sm)] border border-input bg-panel shadow-sm py-4',
        className
      )}
    >
      <CardContent className="px-3 sm:px-4">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 text-left xl:pointer-events-none"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <ShieldCheck
              className="h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span className="truncate text-base text-muted-foreground sm:text-lg">
              Auto-approval
            </span>
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform xl:hidden',
              open && 'rotate-180'
            )}
            aria-hidden
          />
        </button>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {verification ? (
            <Verdict verification={verification} autoApproved={autoApproved} />
          ) : (
            <Badge variant="pirep">Not verified</Badge>
          )}
          {verifiedAt && (
            <LocalTime
              date={verifiedAt}
              className="text-xs text-muted-foreground"
            />
          )}
        </div>

        <div className={cn('xl:block', open ? 'block' : 'hidden')}>
          {verification ? (
            <ul className="mt-4 space-y-3">
              {sortedChecks.map((check) => (
                <CheckRow key={check.id} check={check} />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs leading-snug text-muted-foreground">
              This PIREP was filed before automated checks ran, or auto-approval
              was disabled at the time. Review it manually.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
