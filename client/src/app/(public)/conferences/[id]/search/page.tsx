import { redirect } from 'next/navigation';

interface SearchPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Legacy route - redirects to program tab with search view.
 * This ensures old bookmarks or external links don't 404.
 */
export default async function SearchPage({ params }: SearchPageProps) {
  const { id } = await params;
  redirect(`/conferences/${id}?tab=program`);
}
