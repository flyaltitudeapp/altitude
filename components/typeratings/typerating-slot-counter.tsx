import { cn } from '@/lib/utils';

interface TyperatingSlotCounterProps {
  held: number;
  total: number;
  className?: string;
  /**
   * When true, an over-allocation (held > total) is emphasised with red text.
   * Left off elsewhere so the count still shows the real total but keeps the
   * normal colour.
   */
  highlightOverallocation?: boolean;
}

/**
 * Compact "held/total" pill showing how many type rating slots a pilot has
 * used out of the total granted by their rank. An over-allocation (holding
 * more than the rank grants) is shown as-is, e.g. "8/5" — never hidden. Pass
 * `highlightOverallocation` to flag that state in red.
 */
export function TyperatingSlotCounter({
  held,
  total,
  className,
  highlightOverallocation = false,
}: TyperatingSlotCounterProps) {
  const isOverAllocated = held > total;
  const isFull = !isOverAllocated && total > 0 && held >= total;
  const flagOverallocation = isOverAllocated && highlightOverallocation;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums',
        flagOverallocation
          ? 'border-destructive/40 bg-destructive/10 text-destructive'
          : cn(
              'border-border bg-muted',
              isFull ? 'text-muted-foreground' : 'text-foreground'
            ),
        className
      )}
      title={
        isOverAllocated
          ? `${held} type ratings held — over the ${total} slot${total === 1 ? '' : 's'} granted by this rank`
          : `${held} of ${total} type rating slot${total === 1 ? '' : 's'} used`
      }
    >
      {held}/{total}
    </span>
  );
}
