type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ConferenceSchedulePage({ params }: PageProps) {
  const { id } = await params;
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Schedule for Conference {id}</h1>
      <p className="text-muted-foreground">Public or registered-only schedule view.</p>
      {/* TODO: Render schedule by day/section */}
    </section>
  );
}
