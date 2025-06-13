import { PrismaClient, PresentationStatus, SubmissionType, ReviewStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const CONFERENCE_ID = 1;

  console.log('🎭 Starting COMPLETE presentation seeding for conference ID:', CONFERENCE_ID);

  // Fetch sections, categories, and presentation types for conference 1
  const [sections, categories, presentationTypes] = await Promise.all([
    prisma.section.findMany({
      where: { conferenceId: CONFERENCE_ID },
      orderBy: { order: 'asc' }
    }),
    prisma.category.findMany({
      where: { conferenceId: CONFERENCE_ID },
      orderBy: { order: 'asc' }
    }),
    prisma.presentationType.findMany({
      where: { conferenceId: CONFERENCE_ID },
      orderBy: { order: 'asc' }
    })
  ]);

  if (sections.length === 0) {
    console.error('❌ No sections found. Please run seed-setup-conference first.');
    return;
  }

  console.log(`📍 Found ${sections.length} sections, ${categories.length} categories, ${presentationTypes.length} presentation types`);

  // Create lookup maps
  const sectionMap = sections.reduce((acc, s) => ({ ...acc, [s.name]: s }), {} as Record<string, any>);
  const categoryMap = categories.reduce((acc, c) => ({ ...acc, [c.name]: c }), {} as Record<string, any>);
  const typeMap = presentationTypes.reduce((acc, t) => ({ ...acc, [t.name]: t }), {} as Record<string, any>);

  // Complete presentations with ALL fields
  const presentations = [
    // === SCHEDULED PRESENTATIONS (APPROVED) ===
    {
      title: 'Reinforcement Learning in Real-World Applications',
      abstract: 'Exploring practical applications of reinforcement learning in robotics, game AI, and autonomous systems. We discuss challenges in reward design and sample efficiency.',
      affiliations: ['DeepMind'],
      keywords: ['reinforcement learning', 'robotics', 'game AI', 'reward design'],
      conferenceId: CONFERENCE_ID,
      categoryId: categoryMap['Reinforcement Learning']?.id || categories[0]?.id,
      presentationTypeId: typeMap['Full Research Paper']?.id || presentationTypes[0]?.id,
      requestedDuration: 20,
      finalDuration: 20,
      reviewStatus: ReviewStatus.APPROVED,
      sectionId: sectionMap['ML Foundations']?.id || sections[0].id,
      order: 4,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 20
    },
    {
      title: 'Generative AI: From GANs to Diffusion Models',
      abstract: 'A comprehensive overview of generative AI techniques, covering GANs, VAEs, and the latest diffusion models.',
      affiliations: ['Stability AI'],
      keywords: ['generative AI', 'GANs', 'diffusion models', 'image generation'],
      conferenceId: CONFERENCE_ID,
      categoryId: categoryMap['Deep Learning & Neural Networks']?.id || categories[0]?.id,
      presentationTypeId: typeMap['Full Research Paper']?.id || presentationTypes[0]?.id,
      requestedDuration: 20,
      finalDuration: 20,
      reviewStatus: ReviewStatus.APPROVED,
      sectionId: sectionMap['ML Foundations']?.id || sections[0].id,
      order: 5,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 20
    },
    {
      title: 'Building Conversational AI Systems',
      abstract: 'Hands-on workshop on building chatbots and conversational AI systems.',
      affiliations: ['OpenAI'],
      keywords: ['conversational AI', 'chatbots', 'dialogue systems', 'NLP'],
      conferenceId: CONFERENCE_ID,
      categoryId: categoryMap['Natural Language Processing']?.id || categories[0]?.id,
      presentationTypeId: typeMap['Workshop Session']?.id || presentationTypes[0]?.id,
      requestedDuration: 90,
      finalDuration: 90,
      reviewStatus: ReviewStatus.APPROVED,
      sectionId: sectionMap['NLP Workshop']?.id || sections[1]?.id || sections[0].id,
      order: 4,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 90
    },
    {
      title: 'Vision Transformers: The Future of Computer Vision',
      abstract: 'Exploring how transformer architectures are revolutionizing computer vision.',
      affiliations: ['Google Research'],
      keywords: ['vision transformers', 'ViT', 'computer vision', 'attention'],
      conferenceId: CONFERENCE_ID,
      categoryId: categoryMap['Computer Vision']?.id || categories[0]?.id,
      presentationTypeId: typeMap['Full Research Paper']?.id || presentationTypes[0]?.id,
      requestedDuration: 20,
      finalDuration: 20,
      reviewStatus: ReviewStatus.APPROVED,
      sectionId: sectionMap['Deep Learning Session']?.id || sections[2]?.id || sections[0].id,
      order: 4,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 20
    },
    {
      title: 'Soft Robotics: Bio-Inspired Flexible Systems',
      abstract: 'Exploring the emerging field of soft robotics, inspired by biological systems.',
      affiliations: ['MIT CSAIL'],
      keywords: ['soft robotics', 'bio-inspired', 'flexible systems', 'medical robotics'],
      conferenceId: CONFERENCE_ID,
      categoryId: categoryMap['Robotics & Automation']?.id || categories[0]?.id,
      presentationTypeId: typeMap['Full Research Paper']?.id || presentationTypes[0]?.id,
      requestedDuration: 20,
      finalDuration: 20,
      reviewStatus: ReviewStatus.APPROVED,
      sectionId: sectionMap['Robotics Session']?.id || sections[3]?.id || sections[0].id,
      order: 4,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 20
    },

    // === APPROVED BUT UNSCHEDULED (Perfect for drag & drop testing) ===
    {
      title: 'Quantum Machine Learning: The Next Frontier',
      abstract: 'Exploring the intersection of quantum computing and machine learning.',
      affiliations: ['IBM Research'],
      keywords: ['quantum computing', 'quantum ML', 'optimization', 'quantum algorithms'],
      conferenceId: CONFERENCE_ID,
      categoryId: categoryMap['Emerging Technologies']?.id || categories[0]?.id,
      presentationTypeId: typeMap['Full Research Paper']?.id || presentationTypes[0]?.id,
      requestedDuration: 25,
      finalDuration: null, // Not assigned yet
      reviewStatus: ReviewStatus.APPROVED,
      sectionId: null, // No section assigned
      order: 0,
      status: PresentationStatus.submitted, // Approved but not scheduled
      submissionType: SubmissionType.external,
      duration: 25
    },
    {
      title: 'Neuromorphic Computing: Brain-Inspired AI Hardware',
      abstract: 'Hardware architectures inspired by the human brain for efficient AI computation.',
      affiliations: ['Intel Labs'],
      keywords: ['neuromorphic computing', 'spiking neural networks', 'brain-inspired', 'hardware'],
      conferenceId: CONFERENCE_ID,
      categoryId: categoryMap['Emerging Technologies']?.id || categories[0]?.id,
      presentationTypeId: typeMap['Full Research Paper']?.id || presentationTypes[0]?.id,
      requestedDuration: 30,
      finalDuration: null,
      reviewStatus: ReviewStatus.APPROVED,
      sectionId: null,
      order: 0,
      status: PresentationStatus.submitted,
      submissionType: SubmissionType.external,
      duration: 30
    },
    {
      title: 'Federated Learning for Privacy-Preserving AI',
      abstract: 'Distributed machine learning that keeps data decentralized.',
      affiliations: ['Google Research'],
      keywords: ['federated learning', 'privacy', 'distributed ML', 'edge computing'],
      conferenceId: CONFERENCE_ID,
      categoryId: categoryMap['Machine Learning Foundations']?.id || categories[0]?.id,
      presentationTypeId: typeMap['Industry Track']?.id || presentationTypes[0]?.id,
      requestedDuration: 25,
      finalDuration: null,
      reviewStatus: ReviewStatus.APPROVED,
      sectionId: null,
      order: 0,
      status: PresentationStatus.submitted,
      submissionType: SubmissionType.external,
      duration: 25
    },
    {
      title: 'AI Ethics in Practice: Building Responsible Systems',
      abstract: 'Practical approaches to implementing ethical AI systems.',
      affiliations: ['Partnership on AI'],
      keywords: ['AI ethics', 'bias detection', 'fairness', 'responsible AI'],
      conferenceId: CONFERENCE_ID,
      categoryId: categoryMap['AI Ethics & Fairness']?.id || categories[0]?.id,
      presentationTypeId: typeMap['Panel Discussion']?.id || presentationTypes[0]?.id,
      requestedDuration: 60,
      finalDuration: null,
      reviewStatus: ReviewStatus.APPROVED,
      sectionId: null,
      order: 0,
      status: PresentationStatus.submitted,
      submissionType: SubmissionType.external,
      duration: 60
    },
    {
      title: 'AI-Powered Drug Discovery: From Molecules to Medicine',
      abstract: 'Accelerating pharmaceutical research with AI.',
      affiliations: ['DeepMind'],
      keywords: ['drug discovery', 'molecular design', 'protein folding', 'pharmaceuticals'],
      conferenceId: CONFERENCE_ID,
      categoryId: categoryMap['Healthcare & Medical AI']?.id || categories[0]?.id,
      presentationTypeId: typeMap['Full Research Paper']?.id || presentationTypes[0]?.id,
      requestedDuration: 25,
      finalDuration: null,
      reviewStatus: ReviewStatus.APPROVED,
      sectionId: null,
      order: 0,
      status: PresentationStatus.submitted,
      submissionType: SubmissionType.external,
      duration: 25
    },

    // === PENDING REVIEW ===
    {
      title: 'Explainable AI for Healthcare Applications',
      abstract: 'Making AI decisions transparent and interpretable in medical settings.',
      affiliations: ['Mayo Clinic'],
      keywords: ['explainable AI', 'healthcare', 'interpretability', 'medical AI'],
      conferenceId: CONFERENCE_ID,
      categoryId: categoryMap['Healthcare & Medical AI']?.id || categories[0]?.id,
      presentationTypeId: typeMap['Short Paper Presentation']?.id || presentationTypes[0]?.id,
      requestedDuration: 15,
      finalDuration: null,
      reviewStatus: ReviewStatus.PENDING,
      sectionId: null,
      order: 0,
      status: PresentationStatus.submitted,
      submissionType: SubmissionType.external,
      duration: 15
    },
    {
      title: 'Edge AI: Bringing Intelligence to IoT Devices',
      abstract: 'Optimizing AI models for deployment on resource-constrained edge devices.',
      affiliations: ['NVIDIA Edge AI'],
      keywords: ['edge AI', 'IoT', 'model optimization', 'embedded systems'],
      conferenceId: CONFERENCE_ID,
      categoryId: categoryMap['Industry Applications']?.id || categories[0]?.id,
      presentationTypeId: typeMap['Industry Track']?.id || presentationTypes[0]?.id,
      requestedDuration: 25,
      finalDuration: null,
      reviewStatus: ReviewStatus.PENDING,
      sectionId: null,
      order: 0,
      status: PresentationStatus.submitted,
      submissionType: SubmissionType.external,
      duration: 25
    },

    // === REVISION REQUIRED ===
    {
      title: 'Blockchain AI: Distributed Intelligence Networks',
      abstract: 'Combining blockchain technology with AI for decentralized intelligence.',
      affiliations: ['Blockchain Research Institute'],
      keywords: ['blockchain', 'distributed AI', 'smart contracts', 'consensus'],
      conferenceId: CONFERENCE_ID,
      categoryId: categoryMap['Emerging Technologies']?.id || categories[0]?.id,
      presentationTypeId: typeMap['Short Paper Presentation']?.id || presentationTypes[0]?.id,
      requestedDuration: 15,
      finalDuration: null,
      reviewStatus: ReviewStatus.REVISION_REQUESTED,
      sectionId: null,
      order: 0,
      status: PresentationStatus.submitted,
      submissionType: SubmissionType.external,
      duration: 15
    }
  ];

  // Create presentations
  const createdPresentations = [];
  for (const presentationData of presentations) {
    const presentation = await prisma.presentation.create({
      data: presentationData
    });
    createdPresentations.push(presentation);
  }

  console.log(`📋 Created ${createdPresentations.length} presentations with complete data`);

  // Summary by status
  const approvedCount = createdPresentations.filter(p => p.reviewStatus === ReviewStatus.APPROVED).length;
  const pendingCount = createdPresentations.filter(p => p.reviewStatus === ReviewStatus.PENDING).length;
  const revisionCount = createdPresentations.filter(p => p.reviewStatus === ReviewStatus.REVISION_REQUESTED).length;
  const scheduledCount = createdPresentations.filter(p => p.status === PresentationStatus.scheduled).length;
  const submittedCount = createdPresentations.filter(p => p.status === PresentationStatus.submitted).length;
  
  console.log(`
📊 Presentation Summary:
   ✅ ${approvedCount} approved presentations (${scheduledCount} scheduled + ${submittedCount} unscheduled)
   ⏳ ${pendingCount} pending review
   🔄 ${revisionCount} requiring revision

🎯 Perfect for testing:
   - Schedule Builder: ${submittedCount} approved presentations ready to drag & drop
   - Review Workflow: ${pendingCount + revisionCount} submissions to review
   - All presentations have complete fields: conferenceId, categoryId, presentationTypeId, reviewStatus
  `);

  // Create authors
  await seedPresentationAuthors(createdPresentations);

  console.log('🎭 Complete presentation seeding finished!');
}

async function seedPresentationAuthors(createdPresentations: any[]) {
  const authorAssignments = [
    { 
      presentationId: createdPresentations[0].id,
      authorData: { 
        name: 'Dr. David Silver', 
        email: 'silver@deepmind.com', 
        affiliation: 'DeepMind',
        title: 'Dr.',
        bio: 'Principal Research Scientist at DeepMind, lead researcher on AlphaGo.'
      }, 
      isPresenter: true, 
      order: 1 
    },
    { 
      presentationId: createdPresentations[5].id, // Quantum ML
      authorData: { 
        name: 'Dr. John Preskill', 
        email: 'preskill@caltech.edu', 
        affiliation: 'Caltech',
        title: 'Dr.',
        bio: 'Pioneer in quantum computing and quantum information theory.'
      }, 
      isPresenter: true, 
      order: 1 
    },
    { 
      presentationId: createdPresentations[8].id, // AI Ethics
      authorData: { 
        name: 'Dr. Cynthia Rudin', 
        email: 'rudin@duke.edu', 
        affiliation: 'Duke University',
        title: 'Dr.',
        bio: 'Expert in interpretable machine learning and algorithmic fairness.'
      }, 
      isPresenter: true, 
      order: 1 
    }
  ];

  for (const assignment of authorAssignments) {
    await prisma.presentationAuthor.create({
      data: {
        presentationId: assignment.presentationId,
        authorName: assignment.authorData.name,
        authorEmail: assignment.authorData.email,
        affiliation: assignment.authorData.affiliation,
        isPresenter: assignment.isPresenter,
        isExternal: true,
        order: assignment.order,
        title: assignment.authorData.title,
        bio: assignment.authorData.bio
      }
    });
  }

  console.log(`👨‍🎓 Created authors for ${authorAssignments.length} presentations`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding presentations:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });