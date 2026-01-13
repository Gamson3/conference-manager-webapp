type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ConferenceDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Conference {id}</h1>
      <p className="text-muted-foreground">Overview, schedule, and actions.</p>
      {/* TODO: Pull conference detail summary */}
    </section>
  );
}
