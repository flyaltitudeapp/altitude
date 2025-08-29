'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  CalendarIcon,
  Clock,
  Fuel,
  MapPin,
  MessageSquare,
  Package,
  Plane,
  PlaneTakeoff,
  Star,
} from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { createPirepAction } from '@/actions/pireps/create-pirep';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MAX_CARGO_KG, MAX_FUEL_KG } from '@/lib/constants';
import {
  type ActionErrorResponse,
  extractActionErrorMessage,
} from '@/lib/error-handler';
import { cn } from '@/lib/utils';

const pirepFormSchema = z.object({
  flightNumber: z
    .string()
    .min(3, 'Flight number must be at least 3 characters.'),
  date: z.date().refine((date) => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999); // End of tomorrow

    return date <= tomorrow;
  }, 'Flight date cannot be more than one day in the future'),
  departureIcao: z
    .string()
    .length(4, 'ICAO code must be exactly 4 letters.')
    .regex(/^[A-Z]{4}$/, 'ICAO code must contain only uppercase letters.'),
  arrivalIcao: z
    .string()
    .length(4, 'ICAO code must be exactly 4 letters.')
    .regex(/^[A-Z]{4}$/, 'ICAO code must contain only uppercase letters.'),
  flightTimeHours: z.union([z.number().min(0), z.nan()]),
  flightTimeMinutes: z.union([z.number().min(0).max(59), z.nan()]),
  aircraftId: z.string().min(1, 'Please select an aircraft.'),
  cargo: z.number().min(0),
  fuelBurned: z.number().min(0),
  multiplierId: z.string().optional(),
  comments: z.string().optional(),
});

type PirepFormValues = z.infer<typeof pirepFormSchema>;

interface PirepFormProps {
  aircraft: { id: string; name: string; livery: string }[];
  multipliers: { id: string; name: string; value: number }[];
  maxFlightHours: number | null;
}

export function PirepForm({ aircraft, multipliers }: PirepFormProps) {
  const [flightNumber] = useQueryState('flightNumber', parseAsString);
  const [departureIcao] = useQueryState('departureIcao', parseAsString);
  const [arrivalIcao] = useQueryState('arrivalIcao', parseAsString);
  const [flightTimeHours] = useQueryState('flightTimeHours', parseAsInteger);
  const [flightTimeMinutes] = useQueryState(
    'flightTimeMinutes',
    parseAsInteger
  );
  const [aircraftId] = useQueryState('aircraftId', parseAsString);

  const form = useForm<PirepFormValues>({
    resolver: zodResolver(pirepFormSchema),
    defaultValues: {
      flightNumber: '',
      departureIcao: '',
      arrivalIcao: '',
      flightTimeHours: Number.NaN,
      flightTimeMinutes: Number.NaN,
      cargo: Number.NaN,
      fuelBurned: Number.NaN,
      comments: '',
    },
  });

  useEffect(() => {
    if (flightNumber) {
      form.setValue('flightNumber', flightNumber);
    }
    if (departureIcao) {
      form.setValue('departureIcao', departureIcao);
    }
    if (arrivalIcao) {
      form.setValue('arrivalIcao', arrivalIcao);
    }
    if (flightTimeHours !== null) {
      form.setValue('flightTimeHours', flightTimeHours);
    }
    if (flightTimeMinutes !== null) {
      form.setValue('flightTimeMinutes', flightTimeMinutes);
    }
    if (aircraftId) {
      form.setValue('aircraftId', aircraftId);
    }

    if (!form.getValues('date')) {
      form.setValue('date', new Date());
    }
  }, [
    flightNumber,
    departureIcao,
    arrivalIcao,
    flightTimeHours,
    flightTimeMinutes,
    aircraftId,
    form,
  ]);

  const { execute, isPending } = useAction(createPirepAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(data.message ?? 'PIREP created successfully!');
        form.reset();
        return;
      }
      if (data?.error) {
        toast.error(String(data.error));
        return;
      }
      toast.success('PIREP created successfully!');
      form.reset();
    },
    onError: (errorResponse) => {
      const errorMessage = extractActionErrorMessage(
        errorResponse as ActionErrorResponse,
        'Failed to create PIREP'
      );
      toast.error(errorMessage);
    },
  });

  function onSubmit(data: PirepFormValues) {
    if (
      Number.isNaN(data.flightTimeHours) ||
      Number.isNaN(data.flightTimeMinutes)
    ) {
      toast.error('Please enter flight time (hours and minutes)');
      return;
    }

    const hoursValue = Number.isNaN(data.flightTimeHours)
      ? 0
      : data.flightTimeHours;
    const minutesValue = Number.isNaN(data.flightTimeMinutes)
      ? 0
      : data.flightTimeMinutes;
    const totalFlightTimeMinutes = hoursValue * 60 + minutesValue;

    execute({
      flightNumber: data.flightNumber,
      date: data.date,
      departureIcao: data.departureIcao,
      arrivalIcao: data.arrivalIcao,
      flightTime: totalFlightTimeMinutes,
      cargo: Number.isNaN(data.cargo) ? 0 : data.cargo,
      fuelBurned: Number.isNaN(data.fuelBurned) ? 0 : data.fuelBurned,
      multiplierId:
        data.multiplierId === 'none' ? undefined : data.multiplierId,
      aircraftId: data.aircraftId,
      comments: data.comments,
    });
  }

  const commentsValue = form.watch('comments') || '';

  return (
    <Form {...form}>
      <form
        className="space-y-8 text-foreground"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
          <FormField
            control={form.control}
            name="flightNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  <Plane className="h-4 w-4" />
                  Flight Number *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="AF2"
                    {...field}
                    maxLength={10}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="flex items-center">
                  <CalendarIcon className="h-4 w-4" />
                  Date *
                </FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        className={cn(
                          'pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                        variant={'outline'}
                      >
                        {field.value ? (
                          new Date(field.value).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto border-0 p-0">
                    <Calendar
                      mode="single"
                      onSelect={field.onChange}
                      selected={field.value}
                      disabled={(date) => {
                        const now = new Date();
                        const tomorrow = new Date(now);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        tomorrow.setHours(23, 59, 59, 999);
                        return date > tomorrow;
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="departureIcao"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  <MapPin className="h-4 w-4" />
                  Departure ICAO *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="LFPG"
                    {...field}
                    maxLength={4}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/[^A-Za-z]/g, '')
                        .toUpperCase();
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="arrivalIcao"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  <MapPin className="h-4 w-4" />
                  Arrival ICAO *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="KJFK"
                    {...field}
                    maxLength={4}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/[^A-Za-z]/g, '')
                        .toUpperCase();
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="flightTimeHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  <Clock className="h-4 w-4" />
                  Flight Time (Hours) *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="11"
                    type="text"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={
                      field.value === undefined ||
                      field.value === null ||
                      Number.isNaN(field.value as number)
                        ? ''
                        : (field.value as number)
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key === '-' ||
                        e.key === '+' ||
                        e.key === 'e' ||
                        e.key === '.'
                      ) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        field.onChange(Number.NaN);
                        return;
                      }
                      const value = val.replace(/[^0-9]/g, '');
                      // Only allow 2 digits maximum - block anything longer
                      if (value.length <= 2) {
                        field.onChange(value ? Number(value) : Number.NaN);
                      }
                      // If value is longer than 2 digits, don't update the field
                    }}
                    maxLength={2}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="flightTimeMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  <Clock className="h-4 w-4" />
                  Flight Time (Minutes) *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="34"
                    type="text"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={
                      field.value === undefined ||
                      field.value === null ||
                      Number.isNaN(field.value as number)
                        ? ''
                        : (field.value as number)
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key === '-' ||
                        e.key === '+' ||
                        e.key === 'e' ||
                        e.key === '.'
                      ) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        field.onChange(Number.NaN);
                        return;
                      }
                      let value = val.replace(/[^0-9]/g, '');
                      if (value) {
                        value = Math.min(Number(value), 59).toString();
                        field.onChange(Number(value));
                      } else {
                        field.onChange(Number.NaN);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="aircraftId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  <PlaneTakeoff className="h-4 w-4" />
                  Aircraft *
                </FormLabel>
                <Select
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  key={field.value || 'empty'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an aircraft" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {aircraft.map((ac) => (
                      <SelectItem key={ac.id} value={ac.id}>
                        {ac.name} ({ac.livery})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="multiplierId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  <Star className="h-4 w-4" />
                  Multiplier
                </FormLabel>
                <Select
                  value={field.value || ''}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a multiplier" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {multipliers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.value}x)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cargo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  <Package className="h-4 w-4" />
                  Cargo (kg) *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="2000"
                    type="text"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={
                      field.value === undefined ||
                      field.value === null ||
                      Number.isNaN(field.value as number)
                        ? ''
                        : (field.value as number)
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key === '-' ||
                        e.key === '+' ||
                        e.key === 'e' ||
                        e.key === '.'
                      ) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        field.onChange(Number.NaN);
                        return;
                      }
                      let value = val.replace(/[^0-9]/g, '');
                      if (value) {
                        value = Math.min(
                          Number(value),
                          MAX_CARGO_KG
                        ).toString();
                        field.onChange(Number(value));
                      } else {
                        field.onChange(Number.NaN);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fuelBurned"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  <Fuel className="h-4 w-4" />
                  Fuel Used (kg) *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="8000"
                    type="text"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={
                      field.value === undefined ||
                      field.value === null ||
                      Number.isNaN(field.value as number)
                        ? ''
                        : (field.value as number)
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key === '-' ||
                        e.key === '+' ||
                        e.key === 'e' ||
                        e.key === '.'
                      ) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        field.onChange(Number.NaN);
                        return;
                      }
                      let value = val.replace(/[^0-9]/g, '');
                      if (value) {
                        value = Math.min(Number(value), MAX_FUEL_KG).toString();
                        field.onChange(Number(value));
                      } else {
                        field.onChange(Number.NaN);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="comments"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <FormLabel className="flex items-center">
                    <MessageSquare className="mr-1 h-4 w-4" />
                    Comments
                  </FormLabel>
                  <span className="text-xs text-muted-foreground">
                    {commentsValue.length} / 200
                  </span>
                </div>
                <FormControl>
                  <Textarea
                    className="h-24 resize-none"
                    placeholder="Any comments about the flight..."
                    {...field}
                    maxLength={200}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button disabled={isPending} type="submit">
          {isPending ? 'Submitting...' : 'Submit PIREP'}
        </Button>
      </form>
    </Form>
  );
}
