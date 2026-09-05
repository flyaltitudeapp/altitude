import { Plus } from 'lucide-react';
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
} from 'react';

import { PageLayout } from '@/components/page-layout';
import { Button } from '@/components/ui/button';

interface AdminPageProps {
  title: string;
  description?: string;
  searchBar?: ReactNode;
  createDialog: ReactNode;
  table: ReactNode;
}

export function AdminPage({
  title,
  description,
  searchBar = null,
  createDialog,
  table,
}: AdminPageProps) {
  return (
    <PageLayout
      title={title}
      description={description}
      headerRight={
        <>
          {searchBar}
          <div className="[&>*]:w-full">{createDialog}</div>
        </>
      }
    >
      {table}
    </PageLayout>
  );
}

type CreateButtonProps = { text: string } & ComponentPropsWithoutRef<
  typeof Button
>;

// Forwards ref and props so it can be used as a Radix `asChild` trigger
// (e.g. inside `DialogTrigger`); without this the injected onClick/ref are
// dropped and the button won't open its dialog.
export const CreateButton = forwardRef<HTMLButtonElement, CreateButtonProps>(
  ({ text, ...props }, ref) => (
    <Button ref={ref} className="gap-2" size="default" {...props}>
      <Plus className="h-4 w-4" />
      {text}
    </Button>
  )
);
CreateButton.displayName = 'CreateButton';
