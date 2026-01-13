interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">User {id}</h1>
      <p className="text-muted-foreground">Detail & potential impersonation.</p>
      {/* TODO: User detail + actions */}
    </section>
  );
}
