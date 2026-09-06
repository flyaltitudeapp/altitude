'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useAction } from 'next-safe-action/hooks';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { updateAutoApprovalAction } from '@/actions/airline/update-auto-approval';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type Airline } from '@/db/schema';
import { extractErrorMessage } from '@/lib/error-handler';
import { AUTO_APPROVAL_MODES } from '@/lib/pireps/verification';

const schema = z.object({
  id: z.string(),
  autoApprovalMode: z.enum(AUTO_APPROVAL_MODES),
  autoApprovalTolerance: z
    .number({ message: 'Enter a tolerance between 0 and 100' })
    .int('Tolerance must be a whole number')
    .min(0, 'Tolerance must be at least 0%')
    .max(100, 'Tolerance must be at most 100%'),
  autoApprovalMinPireps: z
    .number({ message: 'Enter a number of PIREPs' })
    .int('Minimum PIREPs must be a whole number')
    .min(0, 'Minimum PIREPs must be at least 0')
    .max(1000, 'Minimum PIREPs must be at most 1000'),
});

type FormValues = z.infer<typeof schema>;

const MODE_DESCRIPTIONS: Record<(typeof AUTO_APPROVAL_MODES)[number], string> =
  {
    off: 'No checks run. PIREPs are reviewed entirely by hand.',
    advisory:
      'Checks run and the results show on each PIREP, but nothing is approved automatically. Use this to confirm the checks agree with your reviewers before letting them act.',
    enabled:
      'PIREPs that pass every check are approved automatically. Anything that fails is left pending for a human — nothing is ever denied automatically.',
  };

interface AutoApprovalFormProps {
  airline: Airline;
}

export function AutoApprovalForm({ airline }: AutoApprovalFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      id: airline.id,
      autoApprovalMode: airline.autoApprovalMode,
      autoApprovalTolerance: airline.autoApprovalTolerance,
      autoApprovalMinPireps: airline.autoApprovalMinPireps,
    },
  });

  const { execute, isExecuting } = useAction(updateAutoApprovalAction, {
    onSuccess: ({ data }) => {
      toast.success(data?.message ?? 'Auto-approval settings updated');
    },
    onError: ({ error }) => {
      toast.error(extractErrorMessage(error, 'Update failed'));
    },
  });

  const selectedMode = form.watch('autoApprovalMode');

  return (
    <form
      onSubmit={form.handleSubmit((values) => execute(values))}
      className="space-y-6"
    >
      <div className="space-y-2">
        <Label htmlFor="autoApprovalMode">Mode</Label>
        <Controller
          control={form.control}
          name="autoApprovalMode"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger id="autoApprovalMode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Disabled</SelectItem>
                <SelectItem value="advisory">Advisory only</SelectItem>
                <SelectItem value="enabled">Enabled</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        <p className="text-sm text-muted-foreground">
          {MODE_DESCRIPTIONS[selectedMode]}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="autoApprovalTolerance">Flight time tolerance</Label>
          <div className="flex items-center gap-2">
            <Input
              id="autoApprovalTolerance"
              type="number"
              min={0}
              max={100}
              {...form.register('autoApprovalTolerance', {
                valueAsNumber: true,
              })}
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <p className="text-sm text-muted-foreground">
            How far a filed flight time may deviate from the route&apos;s
            published time.
          </p>
          {form.formState.errors.autoApprovalTolerance && (
            <p className="text-sm text-destructive">
              {form.formState.errors.autoApprovalTolerance.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="autoApprovalMinPireps">Minimum approved PIREPs</Label>
          <Input
            id="autoApprovalMinPireps"
            type="number"
            min={0}
            max={1000}
            {...form.register('autoApprovalMinPireps', {
              valueAsNumber: true,
            })}
          />
          <p className="text-sm text-muted-foreground">
            Pilots below this many approved PIREPs are always reviewed by a
            human. Set to 0 to apply auto-approval to everyone.
          </p>
          {form.formState.errors.autoApprovalMinPireps && (
            <p className="text-sm text-destructive">
              {form.formState.errors.autoApprovalMinPireps.message}
            </p>
          )}
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        <p>
          <strong>Note:</strong> Career PIREPs are checked but rarely match a
          published route, so they normally stay pending for manual review.
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isExecuting}>
          {isExecuting ? 'Saving...' : 'Save Auto-Approval Settings'}
        </Button>
      </div>
    </form>
  );
}
