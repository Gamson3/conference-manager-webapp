import { redirect } from 'next/navigation';

interface TreePageProps {
  params: Promise<{ id: string }>;
}

/**
 * Legacy route - redirects to program tab with tree view.
 * This ensures old bookmarks or external links don't 404.
 */
export default async function TreePage({ params }: TreePageProps) {
  const { id } = await params;
  redirect(`/conferences/${id}?tab=program`);
}
