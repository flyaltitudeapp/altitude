import { Info } from 'lucide-react';

import { TyperatingCard } from '@/components/typeratings/typerating-card';
import { TyperatingSlotCounter } from '@/components/typeratings/typerating-slot-counter';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface TyperatingsSectionProps {
  typeratings: { id: string; name: string; image: string | null }[];
  availableSlots: number;
  totalSlots: number;
}

export function TyperatingsSection({
  typeratings,
  availableSlots,
  totalSlots,
}: TyperatingsSectionProps) {
  if (availableSlots <= 0 && typeratings.length === 0) {
    return null;
  }

  const held = typeratings.length;

  return (
    <div className="space-y-4">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-medium text-foreground text-lg">
          Your Type Ratings
        </h2>
        <TyperatingSlotCounter held={held} total={totalSlots} />
      </div>

      {availableSlots > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Ready for your next aircraft?</AlertTitle>
          <AlertDescription>
            You&apos;re eligible to earn more type ratings at your current rank.
            Reach out to the staff team to start the certification process for
            another aircraft.
          </AlertDescription>
        </Alert>
      )}

      {typeratings.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {typeratings.map((tr) => (
            <TyperatingCard key={tr.id} name={tr.name} image={tr.image} />
          ))}
        </div>
      )}
    </div>
  );
}
