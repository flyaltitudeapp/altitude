'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, Clock, Compass } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { transferFlightTimeAction } from '@/actions/pireps/transfer-flight-time';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ResponsiveDialogFooter } from '@/components/ui/responsive-dialog-footer';
import { useResponsiveDialog } from '@/hooks/use-responsive-dialog';
import { PIREP_CATEGORIES } from '@/lib/pireps/constants';
import { cn } from '@/lib/utils';

const transferFormSchema = z.object({
  targetUserId: z.string().min(1, 'User ID is required'),
  hours: z.coerce
    .number()
    .min(0, 'Hours must be non-negative')
    .max(10000, 'Hours must be at most 10000'),
  minutes: z.coerce
    .number()
    .min(0, 'Minutes must be non-negative')
    .max(59, 'Minutes must be at most 59'),
  category: z.enum(PIREP_CATEGORIES),
});

type TransferFormData = z.infer<typeof transferFormSchema>;

interface TransferFlightTimeFormProps {
  targetUserId: string;
  targetUserName: string;
}

export function TransferFlightTimeDialog({
  targetUserId,
  targetUserName,
}: TransferFlightTimeFormProps) {
  const [open, setOpen] = useState(false);
  const { dialogStyles } = useResponsiveDialog({
    maxWidth: 'sm:max-w-[420px]',
  });

  const form = useForm({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      targetUserId,
      hours: 0,
      minutes: 0,
      category: 'casual',
    } as const,
  });

  const category = form.watch('category');

  const { execute, isExecuting } = useAction(transferFlightTimeAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(data.message);
        setOpen(false);
        form.reset();
      }
    },
    onError: ({ error }) => {
      if (open) {
        toast.error(error.serverError || 'Failed to transfer flight time');
      }
    },
  });

  const onSubmit = (data: TransferFormData) => {
    if (data.hours === 0 && data.minutes === 0) {
      toast.error('Please enter a flight time greater than 0');
      return;
    }

    execute(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Clock className="h-4 w-4 mr-2" />
          Transfer Flight Time
        </Button>
      </DialogTrigger>
      <DialogContent
        className={`${dialogStyles.className} max-w-[380px]`}
        style={dialogStyles.style}
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Transfer Flight Time</DialogTitle>
          <DialogDescription>
            Add flight time to {targetUserName} by creating an approved PIREP.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => field.onChange('casual')}
                          className={cn(
                            'flex items-start gap-2 rounded-md border p-3 text-left transition-colors',
                            field.value === 'casual'
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-muted/50'
                          )}
                        >
                          <Compass className="h-4 w-4 mt-0.5 flex-shrink-0 text-foreground" />
                          <div className="space-y-0.5">
                            <div className="text-sm font-medium text-foreground">
                              Casual
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Doesn&apos;t affect rank.
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => field.onChange('career')}
                          className={cn(
                            'flex items-start gap-2 rounded-md border p-3 text-left transition-colors',
                            field.value === 'career'
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-muted/50'
                          )}
                        >
                          <Briefcase className="h-4 w-4 mt-0.5 flex-shrink-0 text-foreground" />
                          <div className="space-y-0.5">
                            <div className="text-sm font-medium text-foreground">
                              Career
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Counts toward rank.
                            </p>
                          </div>
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hours</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          min="0"
                          max="10000"
                          {...field}
                          value={field.value?.toString() || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minutes</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          min="0"
                          max="59"
                          {...field}
                          value={field.value?.toString() || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="text-xs text-muted-foreground">
                This will create an approved PIREP with flight number
                &quot;TRANSFER&quot; and add the specified flight time to the
                user&apos;s logbook as a {category} flight.
              </div>
            </div>

            <ResponsiveDialogFooter
              primaryButton={{
                label: 'Transfer Flight Time',
                type: 'submit',
                disabled: isExecuting,
                loading: isExecuting,
                loadingLabel: 'Transferring...',
              }}
              secondaryButton={{
                label: 'Cancel',
                onClick: () => setOpen(false),
                disabled: isExecuting,
                type: 'button',
              }}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
