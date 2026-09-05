'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  CalendarIcon,
  Clock,
  Fuel,
  MapPin,
  MessageSquare,
  Package,
  Plane,
  Star,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import AircraftSelector from '@/components/events/aircraft-selector';
import GatesEditor from '@/components/events/gates-editor';
import ImageUploader from '@/components/events/image-uploader';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ResponsiveDialogFooter } from '@/components/ui/responsive-dialog-footer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { type Aircraft, type Multiplier } from '@/db/schema';
import useImagePreview from '@/hooks/use-image-preview';
import { MAX_CARGO_KG, MAX_FUEL_KG } from '@/lib/constants';
import { extractErrorMessage } from '@/lib/error-handler';
import { fileUrl } from '@/lib/urls';
import { cn } from '@/lib/utils';

const eventFormSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(100, 'Title must be less than 100 characters'),
    description: z
      .string()
      .max(500, 'Description must be less than 500 characters')
      .optional(),
    imageUrl: z.string().optional(),
    departureIcao: z
      .string()
      .length(4, 'ICAO must be exactly 4 characters')
      .regex(/^[A-Z]{4}$/, 'ICAO must contain exactly 4 uppercase letters'),
    arrivalIcao: z
      .string()
      .length(4, 'ICAO must be exactly 4 characters')
      .regex(/^[A-Z]{4}$/, 'ICAO must contain exactly 4 uppercase letters'),
    departureDate: z.date({
      message: 'Departure date is required',
    }),
    departureTimeUtc: z
      .string()
      .min(1, 'Departure time is required')
      .regex(
        /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
        'Time must be in HH:MM format'
      ),
    flightTimeHours: z.number().min(0).optional(),
    flightTimeMinutes: z.number().min(0).max(59).optional(),
    flightTime: z.number().min(1, 'Flight time must be at least 1 minute'),
    flightNumber: z
      .string()
      .min(1, 'Flight number is required')
      .max(20, 'Flight number must be less than 20 characters'),
    cargo: z
      .number()
      .min(0, 'Cargo must be non-negative')
      .max(200000, 'Cargo must be at most 200,000 kg')
      .optional(),
    fuel: z
      .number()
      .min(0, 'Fuel must be non-negative')
      .max(200000, 'Fuel must be at most 200,000 kg')
      .optional(),
    multiplierId: z.string().optional().nullable(),
    status: z.enum(['draft', 'published']),
    aircraftIds: z
      .array(z.string().min(1, 'Aircraft ID is required'))
      .min(1, 'At least one aircraft must be selected'),
    departureGates: z
      .array(z.string().min(1, 'Gate number is required'))
      .optional(),
    arrivalGates: z
      .array(z.string().min(1, 'Gate number is required'))
      .optional(),
  })
  .refine(
    (data) => {
      const totalMinutes =
        (data.flightTimeHours || 0) * 60 + (data.flightTimeMinutes || 0);
      return totalMinutes >= 1;
    },
    {
      message: 'Flight time must be at least 1 minute',
      path: ['flightTime'],
    }
  )
  .refine(
    (data) => {
      const totalMinutes =
        (data.flightTimeHours || 0) * 60 + (data.flightTimeMinutes || 0);
      return totalMinutes <= 1440;
    },
    {
      message: 'Flight time must be at most 24 hours',
      path: ['flightTime'],
    }
  );

export type EventFormData = z.infer<typeof eventFormSchema> & {
  departureTime?: string;
};

interface EventFormProps {
  aircraft: Aircraft[];
  multipliers: Multiplier[];
  onSubmit: (data: EventFormData, imageFile: File | null) => void;
  isSubmitting?: boolean;
  initialData?: Partial<EventFormData>;
  onCancel?: () => void;
  submitButtonText?: string;
  submittingText?: string;
}

function normalizeIcao(input: string) {
  return input
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, 4);
}

export function EventForm({
  aircraft,
  multipliers,
  onSubmit,
  isSubmitting,
  initialData,
  onCancel,
  submitButtonText = 'Create Event',
  submittingText = 'Creating...',
}: EventFormProps) {
  const [selectedAircraftIds, setSelectedAircraftIds] = useState<string[]>(
    initialData?.aircraftIds || []
  );
  const {
    file: imageFile,
    preview: imagePreview,
    meta: imageMeta,
    sizeLabel,
    pick: pickImage,
    remove: removeImage,
    setFromUrl: setPreviewFromUrl,
  } = useImagePreview(4);
  const [isPublishWarningOpen, setIsPublishWarningOpen] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<EventFormData | null>(
    null
  );
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);

  const getInitialDateAndTime = () => {
    if (initialData?.departureTime) {
      const dt = new Date(initialData.departureTime);
      return {
        date: dt,
        time: `${dt.getUTCHours().toString().padStart(2, '0')}:${dt.getUTCMinutes().toString().padStart(2, '0')}`,
      };
    }
    return {
      date: initialData?.departureDate || new Date(),
      time: initialData?.departureTimeUtc || '',
    };
  };

  const initialDateTime = getInitialDateAndTime();

  const defaultValues: Partial<EventFormData> = {
    title: initialData?.title || '',
    description: initialData?.description || '',
    imageUrl: initialData?.imageUrl || '',
    departureIcao: initialData?.departureIcao || '',
    arrivalIcao: initialData?.arrivalIcao || '',
    departureDate: initialDateTime.date,
    departureTimeUtc: initialDateTime.time,
    flightTimeHours: initialData?.flightTimeHours ?? 0,
    flightTimeMinutes: initialData?.flightTimeMinutes ?? 0,
    flightTime:
      initialData?.flightTime ??
      (initialData?.flightTimeHours ?? 0) * 60 +
        (initialData?.flightTimeMinutes ?? 0),
    flightNumber: initialData?.flightNumber || '',
    cargo: initialData?.cargo,
    fuel: initialData?.fuel,
    multiplierId: initialData?.multiplierId ?? null,
    status: initialData?.status || 'draft',
    aircraftIds: initialData?.aircraftIds || [],
    departureGates: initialData?.departureGates || [],
    arrivalGates: initialData?.arrivalGates || [],
  };

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
    mode: 'onSubmit',
  });

  const idealRatio = 16 / 9;
  const ratioOk = imageMeta
    ? Math.abs(imageMeta.w / imageMeta.h - idealRatio) <= 0.02
    : true; // no image => don't block/warn
  const ratioLabel = imageMeta
    ? (imageMeta.w / imageMeta.h).toFixed(2)
    : undefined;

  useEffect(() => {
    if (initialData) {
      // Handle conversion from existing departureTime string to date/time fields
      let departureDate = new Date();
      let departureTimeUtc = '';

      if (initialData.departureTime) {
        const dt = new Date(initialData.departureTime);
        departureDate = dt;
        departureTimeUtc = `${dt.getUTCHours().toString().padStart(2, '0')}:${dt.getUTCMinutes().toString().padStart(2, '0')}`;
      } else if (initialData.departureDate && initialData.departureTimeUtc) {
        departureDate = initialData.departureDate;
        departureTimeUtc = initialData.departureTimeUtc;
      }

      form.reset({
        title: initialData.title || '',
        description: initialData.description || '',
        imageUrl: initialData.imageUrl || '',
        departureIcao: initialData.departureIcao || '',
        arrivalIcao: initialData.arrivalIcao || '',
        departureDate,
        departureTimeUtc,
        flightTimeHours: initialData.flightTimeHours || 0,
        flightTimeMinutes: initialData.flightTimeMinutes || 0,
        flightTime:
          initialData.flightTime ||
          (initialData.flightTimeHours || 0) * 60 +
            (initialData.flightTimeMinutes || 0),
        flightNumber: initialData.flightNumber || '',
        cargo: initialData.cargo,
        fuel: initialData.fuel,
        multiplierId: initialData.multiplierId ?? null,
        status: initialData.status || 'draft',
        aircraftIds: initialData.aircraftIds || [],
        departureGates: initialData.departureGates || [],
        arrivalGates: initialData.arrivalGates || [],
      });

      setSelectedAircraftIds(initialData.aircraftIds || []);

      if (initialData.imageUrl) {
        setPreviewFromUrl(fileUrl(initialData.imageUrl));
      }
    }
  }, [initialData, form, setPreviewFromUrl]);

  const handleSubmit = (data: EventFormData) => {
    const totalFlightTimeMinutes =
      (data.flightTimeHours ?? 0) * 60 + (data.flightTimeMinutes ?? 0);

    // Combine date and time into ISO string
    const departureDateTime = new Date(data.departureDate);
    const [hours, minutes] = data.departureTimeUtc.split(':').map(Number);
    departureDateTime.setUTCHours(hours, minutes, 0, 0);

    const formData = {
      ...data,
      flightTime: totalFlightTimeMinutes,
      departureTime: departureDateTime.toISOString(),
    };

    // If status is being changed to published, show warning
    if (data.status === 'published' && initialData?.status !== 'published') {
      setPendingFormData(formData);
      setPendingImageFile(imageFile);
      setIsPublishWarningOpen(true);
      return;
    }

    try {
      onSubmit(formData, imageFile);
    } catch (err) {
      const message = extractErrorMessage(err, 'Failed to submit event');
      toast.error(message);
    }
  };

  const onInvalid = (errors: Record<string, unknown>) => {
    // Find the first error message to show
    const firstError = Object.values(errors).find(
      (error) => error && typeof error === 'object' && 'message' in error
    ) as { message?: string } | undefined;

    const message =
      firstError?.message || 'Please fix the form errors before submitting';
    toast.error(message);
  };

  const handleImagePick = (f: File) => {
    const { ok, error } = pickImage(f);
    if (!ok && error) {
      toast.error(error);
    }
  };

  const descriptionValue = form.watch('description') || '';

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'flightTimeHours' || name === 'flightTimeMinutes') {
        const hours = value.flightTimeHours ?? 0;
        const minutes = value.flightTimeMinutes ?? 0;
        form.setValue('flightTime', hours * 60 + minutes, {
          shouldValidate: true,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    if (initialData?.aircraftIds) {
      setSelectedAircraftIds(initialData.aircraftIds);
      form.setValue('aircraftIds', initialData.aircraftIds);
    }
  }, [initialData?.aircraftIds, form]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit, onInvalid)}
        className="space-y-8"
        aria-busy={isSubmitting ? 'true' : 'false'}
      >
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Basics</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <MessageSquare className="h-4 w-4" />
                    Title *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Event title" {...field} />
                  </FormControl>

                  <FormMessage className="text-xs mt-1" />
                </FormItem>
              )}
            />

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
                    <Input placeholder="UA" {...field} />
                  </FormControl>

                  <FormMessage className="text-xs mt-1" />
                </FormItem>
              )}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Flight Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      placeholder="KEWR"
                      {...field}
                      inputMode="text"
                      maxLength={4}
                      onChange={(e) =>
                        field.onChange(normalizeIcao(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage className="text-xs mt-1" />
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
                      placeholder="KSFO"
                      {...field}
                      inputMode="text"
                      maxLength={4}
                      onChange={(e) =>
                        field.onChange(normalizeIcao(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage className="text-xs mt-1" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="departureDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <CalendarIcon className="h-4 w-4" />
                    Departure Date *
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            field.value.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto border-0 p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage className="text-xs mt-1" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="departureTimeUtc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Clock className="h-4 w-4" />
                    Departure Time (UTC) *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="14:30"
                      {...field}
                      pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                      maxLength={5}
                      onChange={(e) => {
                        let value = e.target.value;
                        // Auto-format time input
                        value = value.replace(/[^\d:]/g, '');
                        if (value.length === 2 && !value.includes(':')) {
                          value = value + ':';
                        }
                        if (value.length > 5) {
                          value = value.slice(0, 5);
                        }
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage className="text-xs mt-1" />
                </FormItem>
              )}
            />

            {/* <FormField
              control={form.control}
              name="multiplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Star className="h-4 w-4" />
                    Multiplier
                  </FormLabel>
                  <Select
                    value={field.value ?? 'none'}
                    onValueChange={(v) =>
                      field.onChange(v === 'none' ? null : v)
                    }
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

                  <FormMessage className="text-xs mt-1" />
                </FormItem>
              )}
            /> */}

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <MessageSquare className="h-4 w-4" />
                    Status
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs mt-1" />
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
                      placeholder="0"
                      type="text"
                      {...field}
                      value={field.value ?? ''}
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
                        let value = e.target.value.replace(/[^0-9]/g, '');
                        if (value === '') {
                          field.onChange(undefined);
                        } else {
                          value = Math.min(Number(value), 1000).toString();
                          field.onChange(Number(value));
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage className="text-xs mt-1" />
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
                      placeholder="0"
                      type="text"
                      {...field}
                      value={field.value ?? ''}
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
                        let value = e.target.value.replace(/[^0-9]/g, '');
                        if (value === '') {
                          field.onChange(undefined);
                        } else {
                          value = Math.min(Number(value), 59).toString();
                          field.onChange(Number(value));
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage className="text-xs mt-1" />
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
                    Cargo (kg)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={MAX_CARGO_KG}
                      step={1}
                      placeholder="0"
                      autoComplete="off"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === '' ? undefined : Number(v));
                      }}
                    />
                  </FormControl>
                  <FormMessage className="text-xs mt-1" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fuel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Fuel className="h-4 w-4" />
                    Fuel (kg)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={MAX_FUEL_KG}
                      step={1}
                      placeholder="0"
                      autoComplete="off"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === '' ? undefined : Number(v));
                      }}
                    />
                  </FormControl>
                  <FormMessage className="text-xs mt-1" />
                </FormItem>
              )}
            />
          </div>
        </section>

        <section className="space-y-3">
          <AircraftSelector
            aircraft={aircraft}
            selectedIds={selectedAircraftIds}
            onChange={(ids) => {
              setSelectedAircraftIds(ids);
              form.setValue('aircraftIds', ids, { shouldValidate: true });
            }}
            errorMessage={form.formState.errors.aircraftIds?.message as string}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Media</h2>
          <ImageUploader
            preview={imagePreview}
            onPick={handleImagePick}
            onRemove={removeImage}
            meta={imageMeta}
            sizeLabel={sizeLabel}
          />
          {!ratioOk && imageMeta && (
            <div>
              <p>
                <span className="font-medium">Image should be 16:9.</span>{' '}
                Current: {imageMeta.w}×{imageMeta.h}px (ratio ~{ratioLabel}).
                For best results use 1280×720, 1600×900, or 1920×1080 and keep
                key content away from edges. Tip: Crop to 16:9 using macOS
                Preview (Tools → Adjust Size…) or Windows Photos (Edit & Create
                → Crop → 16:9).
              </p>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Notes</h2>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="flex items-center">
                    <MessageSquare className="h-4 w-4" />
                    Description
                  </FormLabel>
                  <span
                    className="text-xs text-muted-foreground"
                    aria-live="polite"
                  >
                    {descriptionValue.length} / 500
                  </span>
                </div>
                <FormControl>
                  <Textarea
                    className="h-24 resize-none"
                    placeholder="Event description..."
                    {...field}
                    maxLength={500}
                  />
                </FormControl>
                <FormMessage className="text-xs mt-1" />
              </FormItem>
            )}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Gates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <GatesEditor
              label="Departure Gates"
              placeholder="Type gate number and press Enter (e.g., A1, B2) - Optional"
              values={form.watch('departureGates') || []}
              onChange={(values) =>
                form.setValue('departureGates', values, {
                  shouldValidate: true,
                })
              }
              errorMessage={
                form.formState.errors.departureGates?.message as string
              }
            />
            <GatesEditor
              label="Arrival Gates"
              placeholder="Type gate number and press Enter (e.g., B1, C2) - Optional"
              values={form.watch('arrivalGates') || []}
              onChange={(values) =>
                form.setValue('arrivalGates', values, { shouldValidate: true })
              }
              errorMessage={
                form.formState.errors.arrivalGates?.message as string
              }
            />
          </div>
        </section>

        <ResponsiveDialogFooter
          primaryButton={{
            label: submitButtonText,
            disabled: Boolean(isSubmitting),
            loading: Boolean(isSubmitting),
            loadingLabel: submittingText,
            type: 'submit',
          }}
          secondaryButton={
            onCancel
              ? {
                  label: 'Cancel',
                  onClick: onCancel,
                  disabled: Boolean(isSubmitting),
                }
              : undefined
          }
        />
      </form>

      <Dialog
        open={isPublishWarningOpen}
        onOpenChange={setIsPublishWarningOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
              Warning
            </DialogTitle>
            <DialogDescription>
              Publishing this event will make it visible to all users.
            </DialogDescription>
            {!ratioOk && imageMeta ? (
              <div className="mt-2 text-sm text-muted-foreground">
                Note: the selected image is not 16:9 (current {imageMeta.w}×
                {imageMeta.h}px, ratio ~{ratioLabel}). For best results, use
                1280×720, 1600×900, or 1920×1080. You can crop using macOS
                Preview (Tools → Adjust Size…) or Windows Photos (Edit & Create
                → Crop → 16:9).
              </div>
            ) : (
              <div className="mt-2 text-sm text-muted-foreground">
                Are you sure you want to proceed?
              </div>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPublishWarningOpen(false);
                setPendingFormData(null);
                setPendingImageFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                try {
                  if (pendingFormData) {
                    onSubmit(pendingFormData, pendingImageFile);
                  }
                } catch (err) {
                  const message = extractErrorMessage(
                    err,
                    'Failed to publish event'
                  );
                  toast.error(message);
                } finally {
                  setIsPublishWarningOpen(false);
                  setPendingFormData(null);
                  setPendingImageFile(null);
                }
              }}
            >
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
