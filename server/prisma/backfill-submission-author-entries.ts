import prisma from '../src/lib/prisma';

async function main(): Promise<void> {
  const submissions = await prisma.submission.findMany({
    select: {
      id: true,
      author: {
        select: {
          name: true,
          email: true,
        },
      },
      authorEmail: true,
      authorAffiliation: true,
      authors: {
        select: { id: true },
        take: 1,
      },
    },
  });

  for (const submission of submissions) {
    if (submission.authors.length > 0) continue;

    const name = submission.author.name;
    const email = submission.authorEmail ?? submission.author.email;

    const affiliations =
      submission.authorAffiliation && submission.authorAffiliation.trim().length > 0
        ? [submission.authorAffiliation.trim()]
        : [];

    await prisma.submissionAuthorEntry.create({
      data: {
        submissionId: submission.id,
        name,
        email,
        affiliations,
        order: 0,
        isPresenter: true,
        isExternal: false,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err: unknown) => {
    console.error('Backfill failed:', err);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
