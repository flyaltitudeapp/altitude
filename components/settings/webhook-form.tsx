'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Calendar,
  Clock,
  Info,
  MessageSquare,
  Plane,
  Star,
  UserPlus,
} from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { updateAirlineAction } from '@/actions/airline/update-airline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { type Airline } from '@/db/schema';
import { extractErrorMessage } from '@/lib/error-handler';

const discordWebhookSchema = z
  .string()
  .regex(
    /^(https?:\/\/).*(discord|discordapp)\.com\/api\/webhooks\/([\d]+)\/([a-zA-Z0-9_-]+)$/,
    'Must be a valid Discord webhook URL'
  )
  .optional()
  .or(z.literal(''));

const schema = z.object({
  id: z.string(),
  name: z.string(),
  callsign: z.string(),
  theme: z
    .string()
    .trim()
    .refine(
      (v) =>
        v === 'default' ||
        /^[a-z0-9-]+$/i.test(v) ||
        /^https?:\/\//i.test(v) ||
        /^\/.+\.css$/i.test(v),
      'Use a preset slug (e.g., aviation-blue), "default", an absolute URL, or a CSS path beginning with /'
    ),
  pirepsWebhookUrl: discordWebhookSchema,
  newApplicationsWebhookUrl: discordWebhookSchema,
  rankUpWebhookUrl: discordWebhookSchema,
  leaveRequestWebhookUrl: discordWebhookSchema,
  inactivityWebhookUrl: discordWebhookSchema,
  typeRatingWebhookUrl: discordWebhookSchema,
});

type FormValues = z.infer<typeof schema>;

const webhookConfigs = [
  {
    key: 'pirepsWebhookUrl' as const,
    label: 'PIREPs',
    description: 'Notifications when PIREPs are submitted or updated',
    icon: MessageSquare,
  },
  {
    key: 'newApplicationsWebhookUrl' as const,
    label: 'Applications',
    description: 'Notifications when new pilot applications are submitted',
    icon: UserPlus,
  },
  {
    key: 'rankUpWebhookUrl' as const,
    label: 'Rank Promotions',
    description: 'Notifications when pilots achieve new ranks',
    icon: Star,
  },
  {
    key: 'leaveRequestWebhookUrl' as const,
    label: 'Leave Requests',
    description: 'Notifications when leave requests are submitted',
    icon: Calendar,
  },
  {
    key: 'inactivityWebhookUrl' as const,
    label: 'Inactivity',
    description:
      'Notifications when pilots become inactive (no flights in 30 days)',
    icon: Clock,
  },
  {
    key: 'typeRatingWebhookUrl' as const,
    label: 'Type Ratings',
    description:
      'Notifications when a pilot has a type rating added or removed',
    icon: Plane,
  },
] as const;

interface WebhookFormProps {
  airline: Airline;
}

export function WebhookForm({ airline }: WebhookFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      id: airline.id,
      name: airline.name,
      callsign: airline.callsign,
      theme: (airline.theme as FormValues['theme']) || 'default',
      pirepsWebhookUrl: airline.pirepsWebhookUrl || '',
      newApplicationsWebhookUrl: airline.newApplicationsWebhookUrl || '',
      rankUpWebhookUrl: airline.rankUpWebhookUrl || '',
      leaveRequestWebhookUrl: airline.leaveRequestWebhookUrl || '',
      inactivityWebhookUrl: airline.inactivityWebhookUrl || '',
      typeRatingWebhookUrl: airline.typeRatingWebhookUrl || '',
    },
  });

  const { execute, isExecuting, result, status } =
    useAction(updateAirlineAction);

  // Prevent duplicate toasts for the same result object
  const lastResultRef = useRef<object | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    // Only react when the result reference changes
    if (result === lastResultRef.current) {
      return;
    }
    lastResultRef.current = result as object | null;

    const res = result as
      | { data?: unknown; serverError?: unknown; validationErrors?: unknown }
      | undefined;

    // Success path: any data returned from action
    if (
      res &&
      typeof res === 'object' &&
      'data' in res &&
      res.data !== undefined
    ) {
      let message = 'Webhook settings updated';
      const data = res.data as unknown;
      if (
        data &&
        typeof data === 'object' &&
        'message' in (data as Record<string, unknown>)
      ) {
        const maybeMsg = (data as { message?: unknown }).message;
        if (typeof maybeMsg === 'string' && maybeMsg.trim().length > 0) {
          message = maybeMsg;
        }
      }
      if (submittedRef.current) {
        toast.success(message);
        submittedRef.current = false;
      }
      return;
    }

    // Error path: serverError or validationErrors present
    if (
      res &&
      typeof res === 'object' &&
      (('serverError' in res && res.serverError !== undefined) ||
        ('validationErrors' in res && res.validationErrors !== undefined))
    ) {
      const errorMessage = extractErrorMessage(res, 'Update failed');
      if (submittedRef.current) {
        toast.error(errorMessage);
        submittedRef.current = false;
      }
    }
  }, [result]);

  useEffect(() => {
    if (!submittedRef.current) {
      return;
    }

    if (status === 'hasSucceeded') {
      const data = (result as { data?: unknown } | undefined)?.data;
      const message =
        data &&
        typeof data === 'object' &&
        'message' in (data as Record<string, unknown>)
          ? typeof (data as { message?: unknown }).message === 'string'
            ? ((data as { message?: string }).message as string)
            : 'Webhook settings updated'
          : 'Webhook settings updated';
      toast.success(message);
      submittedRef.current = false;
    } else if (status === 'hasErrored') {
      const errorMessage = extractErrorMessage(
        result as unknown,
        'Update failed'
      );
      toast.error(errorMessage);
      submittedRef.current = false;
    }
  }, [status, result]);

  const onSubmit = (values: FormValues) => {
    submittedRef.current = true;
    execute(values);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {webhookConfigs.map((config) => (
          <div key={config.key} className="space-y-2">
            <div className="flex items-center gap-2">
              <Label
                htmlFor={config.key}
                className="text-sm font-medium flex items-center"
              >
                <config.icon className="h-4 w-4" />
                {config.label}
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{config.description}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id={config.key}
              {...form.register(config.key)}
              disabled={isExecuting}
              placeholder="https://discord.com/api/webhooks/..."
              type="url"
              className="h-11"
            />
            {form.formState.errors[config.key] && (
              <p className="text-sm text-red-500">
                {form.formState.errors[config.key]?.message}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isExecuting} className="min-w-32">
          {isExecuting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
