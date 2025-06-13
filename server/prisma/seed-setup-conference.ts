import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const CONFERENCE_ID = 1;
  console.log('🏗️ Setting up comprehensive data for Conference 1...');

  // 1. Update all existing sections to belong to conference 1
  const updateResult = await prisma.section.updateMany({
    where: {},
    data: { conferenceId: CONFERENCE_ID }
  });
  console.log(`📍 Updated ${updateResult.count} sections to belong to conference 1`);

  // 2. Update all existing days to belong to conference 1
  const dayUpdateResult = await prisma.day.updateMany({
    where: {},
    data: { conferenceId: CONFERENCE_ID }
  });
  console.log(`📅 Updated ${dayUpdateResult.count} days to belong to conference 1`);

  // 3. Delete existing categories and presentation types for conference 1
  await prisma.category.deleteMany({
    where: { conferenceId: CONFERENCE_ID }
  });
  
  await prisma.presentationType.deleteMany({
    where: { conferenceId: CONFERENCE_ID }
  });
  console.log('🗑️ Cleared existing categories and presentation types');

  // 4. Create comprehensive categories
  const categoryData = [
    {
      name: 'Machine Learning Foundations',
      description: 'Core ML algorithms, theory, and mathematical foundations',
      color: '#3B82F6',
      order: 1
    },
    {
      name: 'Deep Learning & Neural Networks',
      description: 'Deep neural networks, architectures, and optimization techniques',
      color: '#1D4ED8',
      order: 2
    },
    {
      name: 'Natural Language Processing',
      description: 'Text processing, language models, and linguistic applications',
      color: '#8B5CF6',
      order: 3
    },
    {
      name: 'Computer Vision',
      description: 'Image processing, object detection, and visual recognition systems',
      color: '#10B981',
      order: 4
    },
    {
      name: 'Reinforcement Learning',
      description: 'Agent-based learning, policy optimization, and decision making',
      color: '#F59E0B',
      order: 5
    },
    {
      name: 'AI Ethics & Fairness',
      description: 'Responsible AI, bias detection, and ethical considerations',
      color: '#EF4444',
      order: 6
    },
    {
      name: 'Robotics & Automation',
      description: 'Robotic systems, automation, and human-robot interaction',
      color: '#6366F1',
      order: 7
    },
    {
      name: 'Healthcare & Medical AI',
      description: 'AI applications in healthcare, medical imaging, and drug discovery',
      color: '#14B8A6',
      order: 8
    },
    {
      name: 'Industry Applications',
      description: 'Real-world AI implementations in various industries',
      color: '#84CC16',
      order: 9
    },
    {
      name: 'Emerging Technologies',
      description: 'Quantum computing, neuromorphic computing, and future technologies',
      color: '#F97316',
      order: 10
    }
  ];

  // 5. Create presentation types with varied durations
  const presentationTypeData = [
    {
      name: 'Keynote Presentation',
      description: 'Featured speaker with extended presentation time',
      defaultDuration: 45,
      minDuration: 40,
      maxDuration: 60,
      allowsQA: true,
      qaDuration: 15,
      order: 1
    },
    {
      name: 'Full Research Paper',
      description: 'Complete research study presentation with detailed results',
      defaultDuration: 20,
      minDuration: 18,
      maxDuration: 25,
      allowsQA: true,
      qaDuration: 5,
      order: 2
    },
    {
      name: 'Short Paper Presentation',
      description: 'Work-in-progress or preliminary results presentation',
      defaultDuration: 15,
      minDuration: 12,
      maxDuration: 18,
      allowsQA: true,
      qaDuration: 5,
      order: 3
    },
    {
      name: 'Workshop Session',
      description: 'Interactive hands-on workshop with audience participation',
      defaultDuration: 90,
      minDuration: 60,
      maxDuration: 120,
      allowsQA: true,
      qaDuration: 15,
      order: 4
    },
    {
      name: 'Panel Discussion',
      description: 'Multi-speaker panel with moderated discussion',
      defaultDuration: 60,
      minDuration: 45,
      maxDuration: 90,
      allowsQA: true,
      qaDuration: 15,
      order: 5
    },
    {
      name: 'Demo Session',
      description: 'Live demonstration of systems, tools, or applications',
      defaultDuration: 10,
      minDuration: 8,
      maxDuration: 15,
      allowsQA: true,
      qaDuration: 5,
      order: 6
    },
    {
      name: 'Lightning Talk',
      description: 'Quick presentation of ideas or early-stage work',
      defaultDuration: 5,
      minDuration: 3,
      maxDuration: 8,
      allowsQA: false,
      qaDuration: 0,
      order: 7
    },
    {
      name: 'Poster Presentation',
      description: 'Visual presentation during dedicated poster session',
      defaultDuration: 120,
      minDuration: 90,
      maxDuration: 180,
      allowsQA: true,
      qaDuration: 0, // Continuous interaction
      order: 8
    },
    {
      name: 'Industry Track',
      description: 'Industry practitioner sharing real-world experiences',
      defaultDuration: 25,
      minDuration: 20,
      maxDuration: 30,
      allowsQA: true,
      qaDuration: 10,
      order: 9
    },
    {
      name: 'Student Presentation',
      description: 'Graduate student research presentation',
      defaultDuration: 12,
      minDuration: 10,
      maxDuration: 15,
      allowsQA: true,
      qaDuration: 3,
      order: 10
    }
  ];

  // Create categories
  const categories = [];
  for (const categoryInfo of categoryData) {
    const category = await prisma.category.create({
      data: {
        ...categoryInfo,
        conferenceId: CONFERENCE_ID
      }
    });
    categories.push(category);
  }
  console.log(`📂 Created ${categories.length} categories`);

  // Create presentation types
  const presentationTypes = [];
  for (const typeInfo of presentationTypeData) {
    const type = await prisma.presentationType.create({
      data: {
        ...typeInfo,
        conferenceId: CONFERENCE_ID
      }
    });
    presentationTypes.push(type);
  }
  console.log(`🎭 Created ${presentationTypes.length} presentation types`);

  // 6. Create/update submission settings for conference 1
  const existingSettings = await prisma.submissionSettings.findUnique({
    where: { conferenceId: CONFERENCE_ID }
  });

  if (!existingSettings) {
    await prisma.submissionSettings.create({
      data: {
        conferenceId: CONFERENCE_ID,
        submissionDeadline: new Date('2024-07-01T23:59:59Z'),
        allowLateSubmissions: true,
        requireAbstract: true,
        maxAbstractLength: 500,
        requireFullPaper: true,
        allowedFileTypes: ['pdf', 'doc', 'docx'],
        maxFileSize: 25,
        requireAuthorBio: true,
        requireAffiliation: true,
        maxCoAuthors: 8,
        requirePresenterDesignation: true,
        requireKeywords: true,
        minKeywords: 3,
        maxKeywords: 10,
        requirePresentationType: true,
        allowDurationRequest: true,
        submissionGuidelines: 'Papers should be 6-12 pages in IEEE format. Include experimental results and comparison with existing methods.',
        authorGuidelines: 'All authors must be listed with full affiliations. At least one author must register for the conference.',
        reviewCriteria: 'Technical quality, novelty, experimental validation, and clarity of presentation.'
      }
    });
    console.log('📋 Created submission settings');
  }

  console.log('\n✅ Conference setup completed!');
  console.log(`
📊 Summary for Conference 1:
- Categories: ${categories.length}
- Presentation Types: ${presentationTypes.length}
- Submission Settings: ✅ Configured
- Sections updated: ${updateResult.count}
- Days updated: ${dayUpdateResult.count}

🎯 Ready for presentation seeding with all new fields!
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error setting up conference:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });