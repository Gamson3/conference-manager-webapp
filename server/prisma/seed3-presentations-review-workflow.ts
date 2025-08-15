// prisma/seed-presentations.ts
import { PrismaClient, PresentationStatus, SubmissionType, ReviewStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Configurable
const CONFERENCE_ID = parseInt(process.env.CONF_ID || '1', 10);
const RANDOMIZE = process.env.RANDOMIZE === 'true';

// Pools for optional randomization
const topicPool = [
  'Reinforcement Learning in Robotics',
  'Generative AI for Creative Arts',
  'Conversational AI Systems',
  'Vision Transformers in CV',
  'Soft Robotics for Medical Devices',
  'Quantum Machine Learning',
  'Neuromorphic Computing Hardware',
  'Federated Learning for Privacy',
  'AI Ethics in Practice',
  'AI-Powered Drug Discovery',
  'Explainable AI in Healthcare',
  'Edge AI for IoT Devices',
  'Blockchain AI Networks',
  'AI in Advertising Ethics',
  'Graph Neural Networks in Science',
  'Augmented Reality in Education',
  'Climate Modeling with AI',
  'Multi-Agent Reinforcement Learning',
  'Low-Power AI Hardware',
  'AI for Space Exploration'
];

const affiliationPool = [
  'DeepMind', 'Google Research', 'OpenAI', 'MIT CSAIL',
  'IBM Research', 'Intel Labs', 'Stability AI',
  'NVIDIA Edge AI', 'Caltech', 'Duke University',
  'Mayo Clinic', 'Partnership on AI', 'Blockchain Research Institute',
  'AdTech Labs', 'NASA JPL'
];

const keywordPool = [
  'reinforcement learning', 'robotics', 'GANs', 'diffusion models',
  'chatbots', 'transformers', 'quantum computing', 'neuromorphic hardware',
  'federated learning', 'AI ethics', 'drug discovery', 'explainable AI',
  'edge computing', 'blockchain', 'graph neural networks',
  'augmented reality', 'climate modeling', 'multi-agent systems',
  'low-power AI', 'space exploration'
];

// Utility
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function maybeRandom(value: string, pool: string[]) {
  return RANDOMIZE ? pickRandom(pool) : value;
}

async function main() {
  console.log(`🎭 Seeding conference presentations for Conference ID: ${CONFERENCE_ID} (Randomize: ${RANDOMIZE})`);

  const [sections, categories, presentationTypes] = await Promise.all([
    prisma.section.findMany({ where: { conferenceId: CONFERENCE_ID }, orderBy: { order: 'asc' } }),
    prisma.category.findMany({ where: { conferenceId: CONFERENCE_ID }, orderBy: { order: 'asc' } }),
    prisma.presentationType.findMany({ where: { conferenceId: CONFERENCE_ID }, orderBy: { order: 'asc' } })
  ]);

  if (sections.length === 0 || categories.length === 0 || presentationTypes.length === 0) {
    console.error('❌ Missing sections/categories/types. Please run seed-setup-conference first.');
    return;
  }

  type NamedMap<T> = Record<string, T>;
  
  const categoryMap: NamedMap<typeof categories[0]> = categories.reduce((acc, c) => ({ ...acc, [c.name]: c }), {});
  const typeMap: NamedMap<typeof presentationTypes[0]> = presentationTypes.reduce((acc, t) => ({ ...acc, [t.name]: t }), {});
  const sectionMap: NamedMap<typeof sections[0]> = sections.reduce((acc, s) => ({ ...acc, [s.name]: s }), {});

  const presentations: any[] = [];

  // For summary counts and quick title samples per status
  const summaryCounts = {
    approvedScheduled: 0,
    approvedUnscheduled: 0,
    pending: 0,
    revisionRequested: 0,
    rejected: 0,
  };

  const summaryTitles = {
    approvedScheduled: [] as string[],
    approvedUnscheduled: [] as string[],
    pending: [] as string[],
    revisionRequested: [] as string[],
    rejected: [] as string[],
  };

  // Helper to push presentations and collect summary info
  function addPresentation({
    title, status, reviewStatus, scheduledSectionName, order,
    duration, requestedDuration, categoryName, typeName, abstract
  }: any) {
    const presTitle = maybeRandom(title, topicPool);
    presentations.push({
      title: presTitle,
      abstract,
      affiliations: [pickRandom(affiliationPool)],
      keywords: [pickRandom(keywordPool), pickRandom(keywordPool)],
      conferenceId: CONFERENCE_ID,
      categoryId: categoryMap[categoryName]?.id || categories[0].id,
      presentationTypeId: typeMap[typeName]?.id || presentationTypes[0].id,
      requestedDuration,
      finalDuration: status === PresentationStatus.scheduled ? duration : null,
      reviewStatus,
      sectionId: scheduledSectionName ? sectionMap[scheduledSectionName]?.id || sections[0].id : null,
      order,
      status,
      submissionType: SubmissionType.external,
      duration
    });

    // Track counts and sample titles
    if (status === PresentationStatus.scheduled && reviewStatus === ReviewStatus.APPROVED) {
      summaryCounts.approvedScheduled++;
      if (summaryTitles.approvedScheduled.length < 3) summaryTitles.approvedScheduled.push(presTitle);
    } else if (status === PresentationStatus.submitted && reviewStatus === ReviewStatus.APPROVED) {
      summaryCounts.approvedUnscheduled++;
      if (summaryTitles.approvedUnscheduled.length < 3) summaryTitles.approvedUnscheduled.push(presTitle);
    } else if (status === PresentationStatus.submitted && reviewStatus === ReviewStatus.PENDING) {
      summaryCounts.pending++;
      if (summaryTitles.pending.length < 3) summaryTitles.pending.push(presTitle);
    } else if (status === PresentationStatus.submitted && reviewStatus === ReviewStatus.REVISION_REQUESTED) {
      summaryCounts.revisionRequested++;
      if (summaryTitles.revisionRequested.length < 3) summaryTitles.revisionRequested.push(presTitle);
    } else if (status === PresentationStatus.submitted && reviewStatus === ReviewStatus.REJECTED) {
      summaryCounts.rejected++;
      if (summaryTitles.rejected.length < 3) summaryTitles.rejected.push(presTitle);
    }
  }

  // === 5 Approved & Scheduled ===
  [
    'ML Foundations', 'ML Foundations', 'NLP Workshop', 'Deep Learning Session', 'Robotics Session'
  ].forEach((sec, idx) => {
    addPresentation({
      title: topicPool[idx],
      status: PresentationStatus.scheduled,
      reviewStatus: ReviewStatus.APPROVED,
      scheduledSectionName: sec,
      order: idx + 1,
      duration: 20,
      requestedDuration: 20,
      categoryName: categories[idx % categories.length].name,
      typeName: presentationTypes[0].name,
      abstract: 'Approved and scheduled presentation for testing.'
    });
  });

  // === 5 Approved & Unscheduled ===
  for (let i = 0; i < 5; i++) {
    addPresentation({
      title: topicPool[5 + i],
      status: PresentationStatus.submitted,
      reviewStatus: ReviewStatus.APPROVED,
      scheduledSectionName: null,
      order: 0,
      duration: 25,
      requestedDuration: 25,
      categoryName: categories[(i + 1) % categories.length].name,
      typeName: presentationTypes[0].name,
      abstract: 'Approved but awaiting scheduling.'
    });
  }

  // === 10 Pending ===
  for (let i = 0; i < 10; i++) {
    addPresentation({
      title: topicPool[(10 + i) % topicPool.length],
      status: PresentationStatus.submitted,
      reviewStatus: ReviewStatus.PENDING,
      scheduledSectionName: null,
      order: 0,
      duration: 20,
      requestedDuration: 20,
      categoryName: categories[(i + 2) % categories.length].name,
      typeName: presentationTypes[0].name,
      abstract: 'Pending review by organizer.'
    });
  }

  // === 6 Revision Requested ===
  for (let i = 0; i < 6; i++) {
    addPresentation({
      title: `Revision: ${topicPool[(i + 3) % topicPool.length]}`,
      status: PresentationStatus.submitted,
      reviewStatus: ReviewStatus.REVISION_REQUESTED,
      scheduledSectionName: null,
      order: 0,
      duration: 15,
      requestedDuration: 15,
      categoryName: categories[(i + 3) % categories.length].name,
      typeName: presentationTypes[0].name,
      abstract: 'Requires revision due to feedback from reviewers.'
    });
  }

  // === 6 Rejected ===
  for (let i = 0; i < 6; i++) {
    addPresentation({
      title: `Rejected: ${topicPool[(i + 4) % topicPool.length]}`,
      status: PresentationStatus.submitted,
      reviewStatus: ReviewStatus.REJECTED,
      scheduledSectionName: null,
      order: 0,
      duration: 15,
      requestedDuration: 15,
      categoryName: categories[(i + 4) % categories.length].name,
      typeName: presentationTypes[0].name,
      abstract: 'Rejected due to lack of originality or incomplete submission.'
    });
  }

  // Create presentations in DB
  const created = [];
  for (const data of presentations) {
    created.push(await prisma.presentation.create({ data }));
  }

  console.log(`📋 Created ${created.length} presentations.`);

  // Seed authors for all presentations
  await seedAuthors(created);

  // === SUMMARY OUTPUT ===
  console.log(`\nSeeding complete for Conference ID: ${CONFERENCE_ID}\n`);
  console.table([
    { Status: "Approved & Scheduled", Count: summaryCounts.approvedScheduled },
    { Status: "Approved & Unscheduled", Count: summaryCounts.approvedUnscheduled },
    { Status: "Pending Review", Count: summaryCounts.pending },
    { Status: "Revision Requested", Count: summaryCounts.revisionRequested },
    { Status: "Rejected", Count: summaryCounts.rejected },
  ]);
  console.log(`Total Presentations: ${created.length}\n`);

  // Quick sanity check: show first few titles per status
  console.log("Sample Titles Per Status:\n");
  console.log(`- Approved & Scheduled: ${summaryTitles.approvedScheduled.join(", ")}`);
  console.log(`- Approved & Unscheduled: ${summaryTitles.approvedUnscheduled.join(", ")}`);
  console.log(`- Pending Review: ${summaryTitles.pending.join(", ")}`);
  console.log(`- Revision Requested: ${summaryTitles.revisionRequested.join(", ")}`);
  console.log(`- Rejected: ${summaryTitles.rejected.join(", ")}`);
}

async function seedAuthors(presentations: any[]) {
  const authorNames = [
    'Dr. Alice Johnson', 'Prof. Bob Smith', 'Dr. Carol Lee', 'Dr. David Silver',
    'Prof. Emily Wong', 'Dr. Frank Miller', 'Prof. Grace Kim', 'Dr. Henry Zhao'
  ];

  let count = 0;
  for (const pres of presentations) {
    const mainAuthor = {
      presentationId: pres.id,
      authorName: pickRandom(authorNames),
      authorEmail: `author${Math.floor(Math.random() * 1000)}@example.com`,
      affiliation: pickRandom(affiliationPool),
      isPresenter: true,
      isExternal: true,
      order: 1,
      title: 'Dr.',
      bio: 'Expert in their research domain.'
    };
    await prisma.presentationAuthor.create({ data: mainAuthor });
    count++;

    // Optional co-author
    if (Math.random() > 0.5) {
      const coAuthor = {
        presentationId: pres.id,
        authorName: pickRandom(authorNames),
        authorEmail: `coauthor${Math.floor(Math.random() * 1000)}@example.com`,
        affiliation: pickRandom(affiliationPool),
        isPresenter: false,
        isExternal: true,
        order: 2,
        title: 'Prof.',
        bio: 'Contributed significantly to the research.'
      };
      await prisma.presentationAuthor.create({ data: coAuthor });
      count++;
    }
  }
  console.log(`👨‍🎓 Created ${count} authors for ${presentations.length} presentations`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding presentations:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
