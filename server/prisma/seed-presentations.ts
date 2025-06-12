import { PrismaClient, PresentationStatus, SubmissionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const CONFERENCE_ID = 1;

  console.log('🎭 Starting presentation seeding for conference ID:', CONFERENCE_ID);

  // Fetch existing sections for conference ID 1
  const sections = await prisma.section.findMany({
    where: { conferenceId: CONFERENCE_ID },
    orderBy: { order: 'asc' }
  });

  if (sections.length === 0) {
    console.error('❌ No sections found for conference ID 1. Please run the main seed first.');
    return;
  }

  console.log(`📍 Found ${sections.length} sections:`, sections.map(s => s.name));

  // Map sections by name for easier reference
  const sectionMap = sections.reduce((acc, section) => {
    acc[section.name] = section;
    return acc;
  }, {} as Record<string, any>);

  // Additional presentations for schedule builder testing
  const additionalPresentations = [
    // === ML FOUNDATIONS ADDITIONS ===
    {
      title: 'Reinforcement Learning in Real-World Applications',
      abstract: 'Exploring practical applications of reinforcement learning in robotics, game AI, and autonomous systems. We discuss challenges in reward design and sample efficiency.',
      affiliations: ['DeepMind'],
      keywords: ['reinforcement learning', 'robotics', 'game AI', 'reward design'],
      sectionId: sectionMap['ML Foundations']?.id || sections[0].id,
      order: 4,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 20
    },
    {
      title: 'Generative AI: From GANs to Diffusion Models',
      abstract: 'A comprehensive overview of generative AI techniques, covering GANs, VAEs, and the latest diffusion models. Applications in image generation, text-to-image, and beyond.',
      affiliations: ['Stability AI'],
      keywords: ['generative AI', 'GANs', 'diffusion models', 'image generation'],
      sectionId: sectionMap['ML Foundations']?.id || sections[0].id,
      order: 5,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 20
    },
    {
      title: 'Causal Inference in Machine Learning',
      abstract: 'Understanding causality beyond correlation in ML models. Applications in healthcare, economics, and policy making.',
      affiliations: ['MIT CSAIL'],
      keywords: ['causal inference', 'causality', 'machine learning', 'policy'],
      sectionId: sectionMap['ML Foundations']?.id || sections[0].id,
      order: 6,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 20
    },

    // === NLP WORKSHOP ADDITIONS ===
    {
      title: 'Building Conversational AI Systems',
      abstract: 'Hands-on workshop on building chatbots and conversational AI systems. Covers dialogue management, intent recognition, and response generation.',
      affiliations: ['OpenAI'],
      keywords: ['conversational AI', 'chatbots', 'dialogue systems', 'NLP'],
      sectionId: sectionMap['NLP Workshop']?.id || sections[1]?.id || sections[0].id,
      order: 4,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 45
    },
    {
      title: 'Sentiment Analysis and Emotion Detection',
      abstract: 'Advanced techniques for understanding sentiment and emotions in text. Applications in social media monitoring, customer feedback, and content moderation.',
      affiliations: ['Harvard University'],
      keywords: ['sentiment analysis', 'emotion detection', 'text classification', 'social media'],
      sectionId: sectionMap['NLP Workshop']?.id || sections[1]?.id || sections[0].id,
      order: 5,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 45
    },
    {
      title: 'Neural Machine Translation: Recent Advances',
      abstract: 'Latest developments in neural machine translation, including multilingual models, zero-shot translation, and domain adaptation.',
      affiliations: ['Google Translate'],
      keywords: ['machine translation', 'multilingual', 'zero-shot', 'neural networks'],
      sectionId: sectionMap['NLP Workshop']?.id || sections[1]?.id || sections[0].id,
      order: 6,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 45
    },

    // === DEEP LEARNING ADDITIONS ===
    {
      title: 'Vision Transformers: The Future of Computer Vision',
      abstract: 'Exploring how transformer architectures are revolutionizing computer vision. From ViT to DETR and beyond.',
      affiliations: ['Google Research'],
      keywords: ['vision transformers', 'ViT', 'computer vision', 'attention'],
      sectionId: sectionMap['Deep Learning Session']?.id || sections[2]?.id || sections[0].id,
      order: 4,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 20
    },
    {
      title: 'Meta-Learning: Learning to Learn',
      abstract: 'Introduction to meta-learning algorithms that can quickly adapt to new tasks with minimal data. Applications in few-shot learning and rapid adaptation.',
      affiliations: ['UC Berkeley'],
      keywords: ['meta-learning', 'few-shot learning', 'MAML', 'adaptation'],
      sectionId: sectionMap['Deep Learning Session']?.id || sections[2]?.id || sections[0].id,
      order: 5,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 20
    },
    {
      title: 'Efficient Deep Learning for Edge Devices',
      abstract: 'Techniques for deploying deep learning models on resource-constrained devices. Model compression, quantization, and mobile optimization.',
      affiliations: ['NVIDIA'],
      keywords: ['edge computing', 'model compression', 'quantization', 'mobile AI'],
      sectionId: sectionMap['Deep Learning Session']?.id || sections[2]?.id || sections[0].id,
      order: 6,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 20
    },

    // === ROBOTICS ADDITIONS ===
    {
      title: 'Soft Robotics: Bio-Inspired Flexible Systems',
      abstract: 'Exploring the emerging field of soft robotics, inspired by biological systems. Applications in medical devices, underwater exploration, and human-robot interaction.',
      affiliations: ['MIT CSAIL'],
      keywords: ['soft robotics', 'bio-inspired', 'flexible systems', 'medical robotics'],
      sectionId: sectionMap['Robotics Session']?.id || sections[3]?.id || sections[0].id,
      order: 4,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 20
    },
    {
      title: 'Swarm Intelligence in Multi-Robot Systems',
      abstract: 'Coordination and control of robot swarms using distributed algorithms. Applications in search and rescue, environmental monitoring, and construction.',
      affiliations: ['ETH Zurich'],
      keywords: ['swarm robotics', 'multi-robot systems', 'distributed algorithms', 'coordination'],
      sectionId: sectionMap['Robotics Session']?.id || sections[3]?.id || sections[0].id,
      order: 5,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 20
    },
    {
      title: 'Robotic Process Automation in Manufacturing',
      abstract: 'AI-driven automation of manufacturing processes. Predictive maintenance, quality control, and adaptive production lines.',
      affiliations: ['Siemens'],
      keywords: ['manufacturing', 'automation', 'predictive maintenance', 'quality control'],
      sectionId: sectionMap['Robotics Session']?.id || sections[3]?.id || sections[0].id,
      order: 6,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 20
    },

    // === UNSCHEDULED PRESENTATIONS FOR TESTING ===
    {
      title: 'Quantum Machine Learning: The Next Frontier',
      abstract: 'Exploring the intersection of quantum computing and machine learning. Quantum algorithms for optimization and pattern recognition.',
      affiliations: ['IBM Research'],
      keywords: ['quantum computing', 'quantum ML', 'optimization', 'quantum algorithms'],
      sectionId: sectionMap['ML Foundations']?.id || sections[0].id,
      order: 0, // Will be marked as unscheduled
      status: PresentationStatus.submitted, // Not scheduled
      submissionType: SubmissionType.external,
      duration: 25
    },
    {
      title: 'Neuromorphic Computing: Brain-Inspired AI Hardware',
      abstract: 'Hardware architectures inspired by the human brain for efficient AI computation. Spiking neural networks and event-driven processing.',
      affiliations: ['Intel Labs'],
      keywords: ['neuromorphic computing', 'spiking neural networks', 'brain-inspired', 'hardware'],
      sectionId: sectionMap['Deep Learning Session']?.id || sections[2]?.id || sections[0].id,
      order: 0,
      status: PresentationStatus.submitted,
      submissionType: SubmissionType.external,
      duration: 30
    },
    {
      title: 'AI in Climate Change: Predictive Models and Solutions',
      abstract: 'Using AI to understand and combat climate change. Weather prediction, carbon capture optimization, and renewable energy management.',
      affiliations: ['Climate Change AI'],
      keywords: ['climate change', 'environmental AI', 'weather prediction', 'sustainability'],
      sectionId: sectionMap['Robotics Session']?.id || sections[3]?.id || sections[0].id,
      order: 0,
      status: PresentationStatus.submitted,
      submissionType: SubmissionType.external,
      duration: 20
    },
    {
      title: 'Federated Learning for Privacy-Preserving AI',
      abstract: 'Distributed machine learning that keeps data decentralized. Applications in healthcare, finance, and mobile computing.',
      affiliations: ['Google Research'],
      keywords: ['federated learning', 'privacy', 'distributed ML', 'edge computing'],
      sectionId: sectionMap['ML Foundations']?.id || sections[0].id,
      order: 0,
      status: PresentationStatus.submitted,
      submissionType: SubmissionType.external,
      duration: 25
    },
    {
      title: 'AI Ethics in Practice: Building Responsible Systems',
      abstract: 'Practical approaches to implementing ethical AI systems. Bias detection, fairness metrics, and responsible deployment strategies.',
      affiliations: ['Partnership on AI'],
      keywords: ['AI ethics', 'bias detection', 'fairness', 'responsible AI'],
      sectionId: sectionMap['Ethics Keynote']?.id || sections[4]?.id || sections[0].id,
      order: 0,
      status: PresentationStatus.submitted,
      submissionType: SubmissionType.external,
      duration: 35
    },
    {
      title: 'Explainable AI for Healthcare Applications',
      abstract: 'Making AI decisions transparent and interpretable in medical settings. Trust, accountability, and regulatory compliance.',
      affiliations: ['Mayo Clinic'],
      keywords: ['explainable AI', 'healthcare', 'interpretability', 'medical AI'],
      sectionId: sectionMap['Ethics Keynote']?.id || sections[4]?.id || sections[0].id,
      order: 0,
      status: PresentationStatus.submitted,
      submissionType: SubmissionType.external,
      duration: 30
    },
    {
      title: 'AI-Powered Drug Discovery: From Molecules to Medicine',
      abstract: 'Accelerating pharmaceutical research with AI. Molecular design, protein folding prediction, and clinical trial optimization.',
      affiliations: ['DeepMind'],
      keywords: ['drug discovery', 'molecular design', 'protein folding', 'pharmaceuticals'],
      sectionId: sectionMap['ML Foundations']?.id || sections[0].id,
      order: 0,
      status: PresentationStatus.submitted,
      submissionType: SubmissionType.external,
      duration: 25
    }
  ];

  // Create presentations
  const createdPresentations = [];
  for (const presentationData of additionalPresentations) {
    const presentation = await prisma.presentation.create({
      data: presentationData
    });
    createdPresentations.push(presentation);
  }

  console.log(`📋 Created ${createdPresentations.length} additional presentations`);

  // Count scheduled vs unscheduled
  const scheduledCount = createdPresentations.filter(p => p.status === PresentationStatus.scheduled).length;
  const unscheduledCount = createdPresentations.filter(p => p.status === PresentationStatus.submitted).length;
  
  console.log(`   ✅ ${scheduledCount} scheduled presentations`);
  console.log(`   ⏳ ${unscheduledCount} unscheduled presentations`);

  // Create authors for the presentations
  await seedPresentationAuthors(createdPresentations);

  console.log('🎭 Presentation seeding completed!');
}

async function seedPresentationAuthors(createdPresentations: any[]) {
  const authorAssignments = [
    // Scheduled presentations authors
    { 
      presentationId: createdPresentations[0].id,
      authorData: { 
        name: 'Dr. David Silver', 
        email: 'silver@deepmind.com', 
        affiliation: 'DeepMind',
        title: 'Dr.',
        bio: 'Principal Research Scientist at DeepMind, lead researcher on AlphaGo and AlphaStar.'
      }, 
      isPresenter: true, 
      order: 1 
    },
    { 
      presentationId: createdPresentations[1].id,
      authorData: { 
        name: 'Dr. Ian Goodfellow', 
        email: 'goodfellow@apple.com', 
        affiliation: 'Apple',
        title: 'Dr.',
        bio: 'Inventor of Generative Adversarial Networks (GANs).'
      }, 
      isPresenter: true, 
      order: 1 
    },
    { 
      presentationId: createdPresentations[2].id,
      authorData: { 
        name: 'Dr. Judea Pearl', 
        email: 'pearl@cs.ucla.edu', 
        affiliation: 'UCLA',
        title: 'Dr.',
        bio: 'Turing Award winner, pioneer in causal inference and Bayesian networks.'
      }, 
      isPresenter: true, 
      order: 1 
    },
    { 
      presentationId: createdPresentations[3].id,
      authorData: { 
        name: 'Dr. Emily Chen', 
        email: 'echen@openai.com', 
        affiliation: 'OpenAI',
        title: 'Dr.',
        bio: 'Lead researcher in conversational AI and dialogue systems.'
      }, 
      isPresenter: true, 
      order: 1 
    },
    { 
      presentationId: createdPresentations[4].id,
      authorData: { 
        name: 'Prof. Michael Rodriguez', 
        email: 'rodriguez@harvard.edu', 
        affiliation: 'Harvard University',
        title: 'Prof.',
        bio: 'Professor of Computer Science specializing in NLP and sentiment analysis.'
      }, 
      isPresenter: true, 
      order: 1 
    },
    { 
      presentationId: createdPresentations[5].id,
      authorData: { 
        name: 'Dr. Sarah Kim', 
        email: 'kim@google.com', 
        affiliation: 'Google Translate',
        title: 'Dr.',
        bio: 'Senior Staff Engineer at Google Translate team.'
      }, 
      isPresenter: true, 
      order: 1 
    },
    // Unscheduled presentations (for testing drag & drop)
    {
      presentationId: createdPresentations[12].id, // Quantum ML
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
      presentationId: createdPresentations[16].id, // AI Ethics
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

  // Create author assignments
  for (const assignment of authorAssignments) {
    await prisma.presentationAuthor.create({
      data: {
        presentationId: assignment.presentationId,
        authorName: assignment.authorData.name,
        authorEmail: assignment.authorData.email,
        affiliation: assignment.authorData.affiliation,
        isPresenter: assignment.isPresenter,
        isExternal: true, // These are all external speakers
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