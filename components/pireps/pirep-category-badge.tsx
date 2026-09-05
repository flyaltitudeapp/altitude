import { Briefcase, Compass } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type PirepCategory = 'casual' | 'career';

interface PirepCategoryBadgeProps {
  category: PirepCategory;
  className?: string;
  showIcon?: boolean;
}

export function PirepCategoryBadge({
  category,
  className,
  showIcon = true,
}: PirepCategoryBadgeProps) {
  const isCareer = category === 'career';
  const Icon = isCareer ? Briefcase : Compass;

  return (
    <Badge
      variant={isCareer ? 'info' : 'pirep'}
      className={cn('capitalize', className)}
    >
      {showIcon && <Icon />}
      {isCareer ? 'Career' : 'Casual'}
    </Badge>
  );
}
