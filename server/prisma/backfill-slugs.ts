import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

async function backfillConferenceSlugs() {
  const conferences = await prisma.conference.findMany({
    // @ts-ignore slug will exist after prisma generate
    where: { slug: null },
    select: { id: true, name: true },
  });
  for (const c of conferences) {
    const base = slugify(c.name || 'conference');
    // Ensure uniqueness with id suffix
    const slug = `${base}-${c.id}`;
    // @ts-ignore slug will exist after prisma generate
    await prisma.conference.update({
      where: { id: c.id },
      data: ({ slug } as any),
    });
  }
}

async function backfillPresentationSlugs() {
  const presentations = await prisma.presentation.findMany({
    // @ts-ignore slug will exist after prisma generate
    where: { slug: null },
    select: { id: true, title: true },
  });
  for (const p of presentations) {
    const base = slugify(p.title || 'presentation');
    const slug = `${base}-${p.id}`;
    // @ts-ignore slug will exist after prisma generate
    await prisma.presentation.update({
      where: { id: p.id },
      data: ({ slug } as any),
    });
  }
}

async function main() {
  await backfillConferenceSlugs();
  await backfillPresentationSlugs();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    // eslint-disable-next-line no-console
    console.log('Backfill complete');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
