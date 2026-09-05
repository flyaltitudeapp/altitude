'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Search, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const schema = z.object({
  departureIcao: z
    .string()
    .length(4, { message: 'ICAO must be exactly 4 letters' })
    .regex(/^[A-Z]{4}$/, { message: 'ICAO must be 4 uppercase letters (A-Z)' }),
  arrivalIcao: z
    .string()
    .length(4, { message: 'ICAO must be exactly 4 letters' })
    .regex(/^[A-Z]{4}$/, { message: 'ICAO must be 4 uppercase letters (A-Z)' }),
  flightTimeHours: z.union([z.number().min(0), z.nan()]),
  flightTimeMinutes: z.union([z.number().min(0).max(59), z.nan()]),
  details: z.string().optional(),
});

type FormVals = z.infer<typeof schema>;

type RouteFormData = Pick<
  FormVals,
  'departureIcao' | 'arrivalIcao' | 'details'
> & {
  id: string;
  flightTime: number;
  aircraftIds: string[];
  flightNumbers: string[];
};

interface Props {
  initialRoute?: {
    id: string;
    departureIcao: string;
    arrivalIcao: string;
    flightTime: number;
    details?: string | null;
    flightNumbers: string[];
    aircraftIds: string[];
  };
  aircraft: { id: string; name: string; livery: string }[];
  // Callback fired after successful save
  onSaved?: () => void;
  // Action to execute - either create or update
  action: (data: RouteFormData) => Promise<unknown>;
  // Submit button text
  submitText?: string;
  // Mode - create or edit
  mode?: 'create' | 'edit';
  // Optional cancel button to render next to submit
  cancelButton?: React.ReactNode;
}

export default function RouteForm({
  initialRoute,
  aircraft,
  onSaved,
  action,
  submitText = 'Save Changes',
  mode = 'edit',
  cancelButton,
}: Props) {
  const form = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: {
      departureIcao: initialRoute?.departureIcao || '',
      arrivalIcao: initialRoute?.arrivalIcao || '',
      flightTimeHours: initialRoute
        ? Math.floor(initialRoute.flightTime / 60)
        : Number.NaN,
      flightTimeMinutes: initialRoute
        ? initialRoute.flightTime % 60
        : Number.NaN,
      details: initialRoute?.details || '',
    },
  });

  const [selectedAircraftIds, setSelectedAircraftIds] = useState<string[]>(
    initialRoute?.aircraftIds || []
  );
  const [flightNumbers, setFlightNumbers] = useState<string[]>(
    initialRoute?.flightNumbers || []
  );
  const [flightInput, setFlightInput] = useState('');
  const [aircraftSearch, setAircraftSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleAircraft = (id: string) => {
    setSelectedAircraftIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const addFlight = () => {
    const v = flightInput.trim();
    if (v && !flightNumbers.includes(v)) {
      setFlightNumbers((p) => [...p, v]);
    }
    setFlightInput('');
  };
  const removeFlight = (v: string) =>
    setFlightNumbers((p) => p.filter((f) => f !== v));

  const onSubmit = async (data: FormVals) => {
    if (!flightNumbers.length) {
      return toast.error('Add at least one flight number');
    }
    if (!selectedAircraftIds.length) {
      return toast.error('Select at least one aircraft');
    }
    if (
      Number.isNaN(data.flightTimeHours) ||
      Number.isNaN(data.flightTimeMinutes)
    ) {
      return toast.error('Please enter flight time (hours and minutes)');
    }
    setLoading(true);
    try {
      const hoursValue = Number.isNaN(data.flightTimeHours)
        ? 0
        : data.flightTimeHours || 0;
      const minutesValue = Number.isNaN(data.flightTimeMinutes)
        ? 0
        : data.flightTimeMinutes || 0;
      const total = hoursValue * 60 + minutesValue;
      const formData = {
        id: mode === 'create' ? 'new' : initialRoute?.id || '',
        departureIcao: data.departureIcao.toUpperCase(),
        arrivalIcao: data.arrivalIcao.toUpperCase(),
        flightTime: total,
        details: data.details,
        aircraftIds: selectedAircraftIds,
        flightNumbers,
      };
      await action(formData);
      toast.success(
        `Route ${mode === 'create' ? 'created' : 'updated'} successfully`
      );
      onSaved?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : `Failed to ${mode} route`);
    } finally {
      setLoading(false);
    }
  };

  const filteredAircraft = aircraft.filter((ac) => {
    if (!aircraftSearch.trim()) {
      return true;
    }
    const s = aircraftSearch.toLowerCase();
    return (
      ac.name.toLowerCase().includes(s) || ac.livery.toLowerCase().includes(s)
    );
  });

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div>
          <FormLabel className="mb-2">Flight Numbers *</FormLabel>
          <div className="space-y-3">
            {flightNumbers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {flightNumbers.map((f) => (
                  <Badge key={f} variant="secondary" className="gap-1">
                    {f}
                    <button
                      type="button"
                      className="ml-1 rounded hover:bg-primary/20"
                      onClick={() => removeFlight(f)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={flightInput}
                onChange={(e) => setFlightInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addFlight();
                  }
                }}
                placeholder="Type flight number and press enter"
              />
              <Button type="button" onClick={addFlight} variant="secondary">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="departureIcao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departure ICAO *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="uppercase"
                    maxLength={4}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/[^A-Za-z0-9]/g, '')
                        .toUpperCase();
                      field.onChange(value);
                    }}
                    placeholder="KLAX"
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
                <FormLabel>Arrival ICAO *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="uppercase"
                    maxLength={4}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/[^A-Za-z0-9]/g, '')
                        .toUpperCase();
                      field.onChange(value);
                    }}
                    placeholder="KSFO"
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
                <FormLabel>Hours *</FormLabel>
                <FormControl>
                  <Input
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
                    placeholder="5"
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
                <FormLabel>Minutes *</FormLabel>
                <FormControl>
                  <Input
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
                    placeholder="30"
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
                      if (value) {
                        const numValue = Math.min(Number(value), 59);
                        field.onChange(numValue);
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
        </div>

        <div>
          <FormLabel className="mb-2">Aircraft *</FormLabel>
          {aircraft.length === 0 ? (
            <div className="mt-1 flex items-center justify-center rounded-md border border-border bg-background p-4 text-sm text-muted-foreground">
              No aircraft in fleet. Add aircraft before editing routes.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search aircraft..."
                  value={aircraftSearch}
                  onChange={(e) => setAircraftSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {selectedAircraftIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedAircraftIds.map((id) => {
                    const ac = aircraft.find((a) => a.id === id);
                    return ac ? (
                      <Badge key={id} variant="secondary" className="gap-1">
                        {ac.name} - {ac.livery}
                        <button
                          type="button"
                          className="ml-1 rounded hover:bg-primary/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAircraft(id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}

              <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-background">
                {filteredAircraft
                  .filter((ac) => !selectedAircraftIds.includes(ac.id))
                  .map((ac) => (
                    <label
                      key={ac.id}
                      className="flex items-center gap-2 p-2 text-sm hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedAircraftIds.includes(ac.id)}
                        onCheckedChange={() => toggleAircraft(ac.id)}
                        id={ac.id}
                      />
                      <span className="flex-1">
                        {ac.name} - {ac.livery}
                      </span>
                    </label>
                  ))}
                {filteredAircraft.filter(
                  (ac) => !selectedAircraftIds.includes(ac.id)
                ).length === 0 && (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    {aircraftSearch
                      ? `No aircraft found matching "${aircraftSearch}"`
                      : 'All aircraft selected'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <FormField
          control={form.control}
          name="details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Details</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="This route is only operated in winter"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-row gap-2 justify-end">
          {cancelButton}
          <Button disabled={loading} type="submit">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              submitText
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
