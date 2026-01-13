type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ConferenceTreePage({ params }: PageProps) {
  const { id } = await params;
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Structure for Conference {id}</h1>
      <p className="text-muted-foreground">Hierarchical view (deferred for richer interactions).</p>
      {/* TODO: Implement tree view or remove if out of scope */}
    </section>
  );
}
