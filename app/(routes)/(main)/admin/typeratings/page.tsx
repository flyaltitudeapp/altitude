import type { Metadata } from 'next';

import { AdminPage } from '@/components/admin/admin-page';
import { AdminSearchBar } from '@/components/admin/admin-search-bar';
import { TyperatingsTable } from '@/components/typeratings/typeratings-table';
import { TyperatingsToolbar } from '@/components/typeratings/typeratings-toolbar';
import { getTyperatingsPaginated } from '@/db/queries';
import { requireRole } from '@/lib/auth-check';
import { parsePaginationParams } from '@/lib/pagination';

export function generateMetadata(): Metadata {
  return {
    title: 'Type Ratings',
  };
}

interface TyperatingsPageProps {
  searchParams?: Promise<{
    page?: string;
    q?: string;
  }>;
}

export default async function TyperatingsPage({
  searchParams,
}: TyperatingsPageProps) {
  await requireRole(['typeratings']);

  const { page, search, limit } = await parsePaginationParams(searchParams);

  const { typeratings, total } = await getTyperatingsPaginated(
    page,
    limit,
    search
  );

  return (
    <AdminPage
      title="Type Ratings"
      description="Manage type ratings and the aircraft each one covers"
      searchBar={<AdminSearchBar placeholder="Search type rating..." />}
      createDialog={<TyperatingsToolbar />}
      table={
        <TyperatingsTable
          typeratings={typeratings}
          total={total}
          limit={limit}
        />
      }
    />
  );
}
