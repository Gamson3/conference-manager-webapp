import { PrismaClient, Role, ConferenceStatus, PresentationStatus, SubmissionType, SectionType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive conference seeding...');

  // Clear existing data in the correct order (delete child records first)
  // console.log('🧹 Clearing existing data...');

  // // Delete data in dependency order (children first, then parents)
  // await prisma.presentationFavorite.deleteMany({});
  // await prisma.conferenceFavorite.deleteMany({});
  // await prisma.sessionAttendance.deleteMany({}); // Add this
  // await prisma.attendance.deleteMany({});
  // await prisma.presentationAuthor.deleteMany({});
  // await prisma.authorAssignment.deleteMany({}); // Add this
  // await prisma.abstractReview.deleteMany({}); // Add this
  // await prisma.abstractSubmission.deleteMany({}); // Add this
  // await prisma.presentation.deleteMany({});
  // await prisma.conferenceMaterial.deleteMany({}); // Add this - this was causing the error
  // await prisma.conferenceFeedback.deleteMany({}); // Add this missing one
  // await prisma.section.deleteMany({});
  // await prisma.day.deleteMany({});
  // await prisma.conference.deleteMany({});
  // await prisma.impersonationLog.deleteMany({});
  // await prisma.notification.deleteMany({}); 
  // await prisma.user.deleteMany({});

  // console.log('🧹 Cleared existing data');

  // 1. Create Users
  const hashedPassword = await bcrypt.hash('Password123##', 12);

  // Admin user
  const admin = await prisma.user.create({
    data: {
      cognitoId: 'admin-001',
      name: 'Admin User',
      email: 'admin@conference.com',
      password: hashedPassword,
      role: Role.admin,
      bio: 'System administrator with expertise in conference management.',
      organization: 'Conference Management Inc.',
      jobTitle: 'System Administrator'
    }
  });

  // Organizers
  const organizer1 = await prisma.user.create({
    data: {
      cognitoId: '701c89fc-80c1-7096-8a6e-9a096d5666d5',
      name: 'Dr. Sarah Johnson',
      email: 'sarah.johnson@university.edu',
      password: hashedPassword,
      role: Role.organizer,
      bio: 'Professor of Computer Science with 15 years of experience in AI research and conference organization.',
      organization: 'Stanford University',
      jobTitle: 'Professor of Computer Science',
      profileImage: '/avatars/sarah-johnson.jpg'
    }
  });

  const organizer2 = await prisma.user.create({
    data: {
      cognitoId: 'org-002',
      name: 'Prof. Michael Chen',
      email: 'michael.chen@tech.edu',
      password: hashedPassword,
      role: Role.organizer,
      bio: 'Leading researcher in machine learning and neural networks, with over 100 published papers.',
      organization: 'MIT',
      jobTitle: 'Professor of Electrical Engineering',
      profileImage: '/avatars/michael-chen.jpg'
    }
  });

  // Attendees
  const attendees = await Promise.all([
    prisma.user.create({
      data: {
        cognitoId: '905c296c-e0e1-704b-6e4d-2eda74650220',
        name: 'Alice Williams',
        email: 'alice.williams@student.edu',
        password: hashedPassword,
        role: Role.attendee,
        bio: 'PhD student researching natural language processing.',
        organization: 'UC Berkeley',
        jobTitle: 'PhD Student'
      }
    }),
    prisma.user.create({
      data: {
        cognitoId: 'att-002',
        name: 'Bob Rodriguez',
        email: 'bob.rodriguez@company.com',
        password: hashedPassword,
        role: Role.attendee,
        bio: 'Senior software engineer specializing in AI applications.',
        organization: 'Google',
        jobTitle: 'Senior Software Engineer'
      }
    }),
    prisma.user.create({
      data: {
        cognitoId: 'att-003',
        name: 'Carol Lee',
        email: 'carol.lee@research.org',
        password: hashedPassword,
        role: Role.attendee,
        bio: 'Research scientist focused on computer vision and robotics.',
        organization: 'OpenAI',
        jobTitle: 'Research Scientist'
      }
    })
  ]);

  console.log('👥 Created users');

  // 2. Create a comprehensive conference
  const conference = await prisma.conference.create({
    data: {
      name: 'International Conference on Artificial Intelligence 2024',
      description: `The International Conference on Artificial Intelligence 2024 (ICAI 2024) brings together leading researchers, practitioners, and students from around the world to share cutting-edge research and developments in artificial intelligence.

This year's conference focuses on:
• Machine Learning and Deep Learning
• Natural Language Processing
• Computer Vision
• Robotics and Autonomous Systems
• AI Ethics and Society
• Quantum Computing for AI

Join us for three days of inspiring presentations, workshops, and networking opportunities with the brightest minds in AI.`,
      startDate: new Date('2024-07-15T09:00:00Z'),
      endDate: new Date('2024-07-17T17:00:00Z'),
      location: 'San Francisco, CA, USA',
      venue: 'Moscone Convention Center',
      capacity: 1500,
      websiteUrl: 'https://icai2024.conference.com',
      topics: ['Artificial Intelligence', 'Machine Learning', 'Deep Learning', 'Natural Language Processing', 'Computer Vision', 'Robotics'],
      status: ConferenceStatus.published,
      isPublic: true,
      createdById: organizer1.id,
      registrationDeadline: new Date('2024-07-01T23:59:59Z') // Use existing field instead of submissionDeadline
    }
  });

  console.log('🏛️ Created conference');

  // 3. Create conference days
  const day1 = await prisma.day.create({
    data: {
      name: 'Opening Day - Foundations of AI',
      date: new Date('2024-07-15'),
      order: 1,
      conferenceId: conference.id
    }
  });

  const day2 = await prisma.day.create({
    data: {
      name: 'Advanced Topics in Machine Learning',
      date: new Date('2024-07-16'),
      order: 2,
      conferenceId: conference.id
    }
  });

  const day3 = await prisma.day.create({
    data: {
      name: 'Future of AI and Society',
      date: new Date('2024-07-17'),
      order: 3,
      conferenceId: conference.id
    }
  });

  console.log('📅 Created conference days');

  // 4. Create sections for each day
  // Day 1 sections
  const openingKeynote = await prisma.section.create({
    data: {
      name: 'Opening Keynote',
      description: 'Welcome address and keynote presentation on the future of artificial intelligence',
      startTime: new Date('2024-07-15T09:00:00Z'),
      endTime: new Date('2024-07-15T10:30:00Z'),
      room: 'Main Auditorium',
      capacity: 1500,
      type: SectionType.keynote,
      order: 1,
      dayId: day1.id,
      conferenceId: conference.id // Add this required field
    }
  });

  const mlFoundations = await prisma.section.create({
    data: {
      name: 'Machine Learning Foundations',
      description: 'Fundamental concepts and recent advances in machine learning',
      startTime: new Date('2024-07-15T11:00:00Z'),
      endTime: new Date('2024-07-15T12:30:00Z'),
      room: 'Hall A',
      capacity: 500,
      type: SectionType.presentation,
      order: 2,
      dayId: day1.id,
      conferenceId: conference.id
    }
  });

  const nlpWorkshop = await prisma.section.create({
    data: {
      name: 'Natural Language Processing Workshop',
      description: 'Hands-on workshop covering latest NLP techniques and tools',
      startTime: new Date('2024-07-15T14:00:00Z'),
      endTime: new Date('2024-07-15T17:00:00Z'),
      room: 'Workshop Room 1',
      capacity: 100,
      type: SectionType.workshop,
      order: 3,
      dayId: day1.id,
      conferenceId: conference.id
    }
  });

  // Day 2 sections
  const deepLearningSession = await prisma.section.create({
    data: {
      name: 'Deep Learning Advances',
      description: 'Latest breakthroughs in deep learning architectures and applications',
      startTime: new Date('2024-07-16T09:00:00Z'),
      endTime: new Date('2024-07-16T10:30:00Z'),
      room: 'Hall A',
      capacity: 500,
      type: SectionType.presentation,
      order: 1,
      dayId: day2.id,
      conferenceId: conference.id
    }
  });

  const computerVisionPanel = await prisma.section.create({
    data: {
      name: 'Computer Vision Panel Discussion',
      description: 'Expert panel discussing the future of computer vision technology',
      startTime: new Date('2024-07-16T11:00:00Z'),
      endTime: new Date('2024-07-16T12:30:00Z'),
      room: 'Hall B',
      capacity: 300,
      type: SectionType.panel,
      order: 2,
      dayId: day2.id,
      conferenceId: conference.id
    }
  });

  const roboticsSession = await prisma.section.create({
    data: {
      name: 'Robotics and Autonomous Systems',
      description: 'Cutting-edge research in robotics and autonomous systems',
      startTime: new Date('2024-07-16T14:00:00Z'),
      endTime: new Date('2024-07-16T15:30:00Z'),
      room: 'Hall A',
      capacity: 500,
      type: SectionType.presentation,
      order: 3,
      dayId: day2.id,
      conferenceId: conference.id
    }
  });

  // Day 3 sections
  const ethicsKeynote = await prisma.section.create({
    data: {
      name: 'AI Ethics and Society Keynote',
      description: 'Exploring the ethical implications of AI in modern society',
      startTime: new Date('2024-07-17T09:00:00Z'),
      endTime: new Date('2024-07-17T10:30:00Z'),
      room: 'Main Auditorium',
      capacity: 1500,
      type: SectionType.keynote,
      order: 1,
      dayId: day3.id,
      conferenceId: conference.id
    }
  });

  const futurePanel = await prisma.section.create({
    data: {
      name: 'Future of AI: Industry Perspectives',
      description: 'Industry leaders discuss the future direction of AI technology',
      startTime: new Date('2024-07-17T11:00:00Z'),
      endTime: new Date('2024-07-17T12:30:00Z'),
      room: 'Main Auditorium',
      capacity: 1500,
      type: SectionType.panel,
      order: 2,
      dayId: day3.id,
      conferenceId: conference.id
    }
  });

  const closingSession = await prisma.section.create({
    data: {
      name: 'Closing Ceremony and Awards',
      description: 'Conference wrap-up and recognition of outstanding contributions',
      startTime: new Date('2024-07-17T15:00:00Z'),
      endTime: new Date('2024-07-17T17:00:00Z'),
      room: 'Main Auditorium',
      capacity: 1500,
      type: SectionType.keynote,
      order: 3,
      dayId: day3.id,
      conferenceId: conference.id
    }
  });

  console.log('📋 Created sections');

  // 5. Create presentations (using only fields that exist in your schema)
  const presentations = [
    // Opening Keynote
    {
      title: 'The Next Frontier: Artificial General Intelligence',
      abstract: 'In this opening keynote, we explore the current state and future prospects of artificial general intelligence (AGI). We discuss the key challenges, breakthrough moments, and potential timeline for achieving human-level AI capabilities across diverse domains.',
      affiliations: ['Google DeepMind', 'University of Toronto'],
      keywords: ['AGI', 'artificial intelligence', 'machine learning', 'future technology'],
      conferenceId: conference.id, // ✅ Add this line
      sectionId: openingKeynote.id,
      order: 1,
      status: PresentationStatus.scheduled, // Use existing enum value
      submissionType: SubmissionType.external, // Use existing enum value
      duration: 90 // This field exists in your schema
    },
    // ML Foundations
    {
      title: 'Transformer Architectures: Beyond Language Models',
      abstract: 'This presentation explores the evolution of transformer architectures beyond their original application in natural language processing. We examine recent applications in computer vision, protein folding, and multimodal learning.',
      affiliations: ['Stanford University'],
      keywords: ['transformers', 'neural networks', 'attention mechanism', 'multimodal learning'],
      conferenceId: conference.id, // ✅ Add this line
      sectionId: mlFoundations.id,
      order: 1,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.internal,
      duration: 20
    },
    {
      title: 'Federated Learning: Privacy-Preserving AI',
      abstract: 'An in-depth look at federated learning techniques that enable collaborative model training while preserving data privacy. We present recent advances in federated optimization and real-world deployment challenges.',
      affiliations: ['New York University', 'Meta'],
      keywords: ['federated learning', 'privacy', 'distributed computing', 'optimization'],
      conferenceId: conference.id, // ✅ Add this line
      sectionId: mlFoundations.id,
      order: 2,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 20
    },
    {
      title: 'Explainable AI: Making Black Boxes Transparent',
      abstract: 'This talk addresses the critical need for interpretable machine learning models. We present novel techniques for explaining complex AI decisions and their applications in healthcare, finance, and autonomous systems.',
      affiliations: ['MIT'],
      keywords: ['explainable AI', 'interpretability', 'transparency', 'trust'],
      conferenceId: conference.id, // ✅ Add this line
      sectionId: mlFoundations.id,
      order: 3,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.internal,
      duration: 20
    },
    // NLP Workshop presentations
    {
      title: 'Building Large Language Models from Scratch',
      abstract: 'A hands-on tutorial on designing, training, and fine-tuning large language models. Participants will learn about data preparation, model architecture design, and efficient training strategies.',
      affiliations: ['Stanford University'],
      keywords: ['large language models', 'GPT', 'BERT', 'fine-tuning', 'training'],
      conferenceId: conference.id, // ✅ Add this line
      sectionId: nlpWorkshop.id,
      order: 1,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 60
    },
    {
      title: 'Advanced Prompt Engineering Techniques',
      abstract: 'Learn advanced strategies for crafting effective prompts for large language models. This session covers chain-of-thought prompting, few-shot learning, and prompt optimization techniques.',
      affiliations: ['Google'],
      keywords: ['prompt engineering', 'few-shot learning', 'chain-of-thought', 'optimization'],
      conferenceId: conference.id, // ✅ Add this line
      sectionId: nlpWorkshop.id,
      order: 2,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.internal,
      duration: 45
    },
    {
      title: 'Multilingual NLP: Breaking Language Barriers',
      abstract: 'Explore techniques for building NLP systems that work across multiple languages. We cover cross-lingual transfer learning, multilingual embeddings, and zero-shot language adaptation.',
      affiliations: ['MIT'],
      keywords: ['multilingual NLP', 'cross-lingual', 'transfer learning', 'embeddings'],
      conferenceId: conference.id, // ✅ Add this line
      sectionId: nlpWorkshop.id,
      order: 3,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 45
    },
    // Deep Learning Advances
    {
      title: 'Graph Neural Networks: Modeling Relational Data',
      abstract: 'A comprehensive overview of graph neural network architectures and their applications. We discuss GCNs, GraphSAGE, and attention-based graph networks with real-world case studies.',
      affiliations: ['University of Montreal'],
      keywords: ['graph neural networks', 'GNN', 'relational data', 'social networks'],
      conferenceId: conference.id, // ✅ Add this line
      sectionId: deepLearningSession.id,
      order: 1,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 20
    },
    {
      title: 'Self-Supervised Learning: Learning Without Labels',
      abstract: 'This presentation explores self-supervised learning techniques that leverage unlabeled data. We examine contrastive learning, masked language modeling, and their applications across domains.',
      affiliations: ['OpenAI'],
      keywords: ['self-supervised learning', 'contrastive learning', 'unlabeled data', 'representation learning'],
      conferenceId: conference.id, // ✅ Add this line
      sectionId: deepLearningSession.id,
      order: 2,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.internal,
      duration: 20
    },
    {
      title: 'Neural Architecture Search: Automated Model Design',
      abstract: 'Learn about automated neural architecture search (NAS) techniques that can discover optimal network designs. We cover evolutionary algorithms, reinforcement learning-based NAS, and efficient search strategies.',
      affiliations: ['Stanford University'],
      keywords: ['neural architecture search', 'NAS', 'automated design', 'optimization'],
      conferenceId: conference.id, // ✅ Add this line
      sectionId: deepLearningSession.id,
      order: 3,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 20
    },
    // Computer Vision Panel
    {
      title: 'Computer Vision in the Age of Foundation Models',
      abstract: 'A panel discussion featuring leading experts in computer vision discussing the impact of foundation models like CLIP, DALL-E, and Stable Diffusion on the field of computer vision.',
      affiliations: ['Stanford University', 'NVIDIA Research', 'Microsoft Research'],
      keywords: ['computer vision', 'foundation models', 'CLIP', 'generative AI'],
      conferenceId: conference.id, // ✅ Add this line
      sectionId: computerVisionPanel.id,
      order: 1,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 90
    },
    // Robotics Session
    {
      title: 'Embodied AI: Bridging Simulation and Reality',
      abstract: 'This talk explores the challenges and solutions in transferring AI capabilities from simulation to real-world robotic systems. We discuss sim-to-real transfer, domain adaptation, and embodied learning.',
      affiliations: ['Carnegie Mellon University'],
      keywords: ['embodied AI', 'robotics', 'sim-to-real', 'domain adaptation'],
      conferenceId: conference.id, // ✅ Add this line
      sectionId: roboticsSession.id,
      order: 1,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 20
    },
    {
      title: 'Autonomous Vehicles: AI at the Wheel',
      abstract: 'An examination of AI technologies powering autonomous vehicles, including perception systems, path planning algorithms, and safety considerations. We present recent advances and remaining challenges.',
      affiliations: ['Tesla AI'],
      keywords: ['autonomous vehicles', 'self-driving cars', 'perception', 'path planning'],
      conferenceId: conference.id, // ✅ Add this line
      sectionId: roboticsSession.id,
      order: 2,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 20
    },
    {
      title: 'Human-Robot Collaboration in Manufacturing',
      abstract: 'This presentation discusses the integration of collaborative robots (cobots) in manufacturing environments. We explore safety protocols, AI-driven task allocation, and human-robot interaction design.',
      affiliations: ['Boston Dynamics'],
      keywords: ['human-robot collaboration', 'cobots', 'manufacturing', 'safety'],
      conferenceId: conference.id, // ✅ Add this line
      sectionId: roboticsSession.id,
      order: 3,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 20
    },
    // Ethics Keynote
    {
      title: 'AI for Good: Balancing Innovation and Responsibility',
      abstract: 'This keynote addresses the ethical implications of AI development and deployment. We discuss bias mitigation, fairness in AI systems, and the responsibility of researchers and practitioners in building beneficial AI.',
      affiliations: ['DAIR Institute'],
      keywords: ['AI ethics', 'fairness', 'bias', 'responsible AI', 'AI for good'],
      conferenceId: conference.id, // ✅ Add this line
      sectionId: ethicsKeynote.id,
      order: 1,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 90
    },
    // Future Panel
    {
      title: 'Industry Roundtable: The Next Decade of AI',
      abstract: 'Industry leaders from major tech companies discuss their vision for the future of AI, including emerging applications, technological challenges, and societal impacts.',
      affiliations: ['Microsoft', 'Google', 'OpenAI'],
      keywords: ['industry perspective', 'future of AI', 'emerging applications', 'technology trends'],
      conferenceId: conference.id, // ✅ Add this line
      sectionId: futurePanel.id,
      order: 1,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.external,
      duration: 90
    },
    // Closing Session
    {
      title: 'Conference Highlights and Future Directions',
      abstract: 'A summary of key insights from the conference and a look ahead to future research directions in artificial intelligence. Recognition of outstanding presentations and contributions.',
      affiliations: ['Stanford University', 'MIT'],
      keywords: ['conference summary', 'future directions', 'research trends', 'awards'],
      conferenceId: conference.id, // ✅ Add this line
      sectionId: closingSession.id,
      order: 1,
      status: PresentationStatus.scheduled,
      submissionType: SubmissionType.internal,
      duration: 120
    }
  ];

  const createdPresentations = [];
  for (const presentationData of presentations) {
    const presentation = await prisma.presentation.create({
      data: presentationData
    });
    createdPresentations.push(presentation);
  }

  console.log('🎤 Created presentations');

  // 6. Create authors for presentations (using correct field names from schema)
  const authorAssignments = [
    // Opening Keynote - External speaker
    {
      presentationId: createdPresentations[0].id,
      authorData: {
        name: 'Dr. Geoffrey Hinton',
        email: 'hinton@deepmind.com',
        affiliation: 'Google DeepMind',
        title: 'Dr.',
        bio: 'Pioneer in deep learning and artificial neural networks, often called the "Godfather of AI".',
        country: 'Canada'
      },
      isPresenter: true,
      order: 1
    },

    // ML Foundations presentations
    {
      presentationId: createdPresentations[1].id,
      authorData: {
        name: organizer1.name,
        email: organizer1.email,
        affiliation: organizer1.organization,
        userId: organizer1.id
      },
      isPresenter: true,
      order: 1
    },
    {
      presentationId: createdPresentations[1].id,
      authorData: {
        name: 'Dr. Jane Smith',
        email: 'jane.smith@university.edu',
        affiliation: 'Stanford University',
        title: 'Dr.'
      },
      isPresenter: false,
      order: 2
    },

    {
      presentationId: createdPresentations[2].id,
      authorData: {
        name: 'Dr. Yann LeCun',
        email: 'lecun@nyu.edu',
        affiliation: 'New York University & Meta',
        title: 'Dr.',
        bio: 'Turing Award winner and Chief AI Scientist at Meta, known for convolutional neural networks.',
        country: 'USA'
      },
      isPresenter: true,
      order: 1
    },
    {
      presentationId: createdPresentations[2].id,
      authorData: {
        name: attendees[0].name,
        email: attendees[0].email,
        affiliation: attendees[0].organization,
        userId: attendees[0].id
      },
      isPresenter: false,
      order: 2
    },

    {
      presentationId: createdPresentations[3].id,
      authorData: {
        name: organizer2.name,
        email: organizer2.email,
        affiliation: organizer2.organization,
        userId: organizer2.id
      },
      isPresenter: true,
      order: 1
    },

    // NLP Workshop
    {
      presentationId: createdPresentations[4].id,
      authorData: {
        name: 'Dr. Fei-Fei Li',
        email: 'feifeili@stanford.edu',
        affiliation: 'Stanford University',
        title: 'Dr.',
        bio: 'Leading researcher in computer vision and AI, co-director of Human-Centered AI Institute.',
        country: 'USA'
      },
      isPresenter: true,
      order: 1
    },
    {
      presentationId: createdPresentations[4].id,
      authorData: {
        name: 'Dr. Maria Garcia',
        email: 'maria.garcia@tech.com',
        affiliation: 'Google Research',
        title: 'Dr.'
      },
      isPresenter: true,
      order: 2
    },

    {
      presentationId: createdPresentations[5].id,
      authorData: {
        name: attendees[1].name,
        email: attendees[1].email,
        affiliation: attendees[1].organization,
        userId: attendees[1].id
      },
      isPresenter: true,
      order: 1
    },

    {
      presentationId: createdPresentations[6].id,
      authorData: {
        name: 'Dr. Ahmed Hassan',
        email: 'ahmed.hassan@university.edu',
        affiliation: 'MIT',
        title: 'Dr.'
      },
      isPresenter: true,
      order: 1
    },

    // Deep Learning presentations
    {
      presentationId: createdPresentations[7].id,
      authorData: {
        name: 'Dr. Yoshua Bengio',
        email: 'bengio@mila.quebec',
        affiliation: 'University of Montreal',
        title: 'Dr.',
        bio: 'Turing Award winner and scientific director of Mila - Quebec AI Institute.',
        country: 'Canada'
      },
      isPresenter: true,
      order: 1
    },
    {
      presentationId: createdPresentations[8].id,
      authorData: {
        name: attendees[2].name,
        email: attendees[2].email,
        affiliation: attendees[2].organization,
        userId: attendees[2].id
      },
      isPresenter: true,
      order: 1
    },
    {
      presentationId: createdPresentations[9].id,
      authorData: {
        name: 'Dr. Andrew Ng',
        email: 'ang@stanford.edu',
        affiliation: 'Stanford University',
        title: 'Dr.',
        bio: 'Co-founder of Coursera, former head of Baidu AI Group and Google Brain, pioneer in online education for AI.',
        country: 'USA'
      },
      isPresenter: true,
      order: 1
    },

    // Computer Vision Panel
    {
      presentationId: createdPresentations[10].id,
      authorData: {
        name: 'Dr. Fei-Fei Li',
        email: 'feifeili@stanford.edu',
        affiliation: 'Stanford University',
        title: 'Dr.'
      },
      isPresenter: true,
      order: 1
    },
    {
      presentationId: createdPresentations[10].id,
      authorData: {
        name: 'Dr. Alex Thompson',
        email: 'alex.thompson@nvidia.com',
        affiliation: 'NVIDIA Research',
        title: 'Dr.'
      },
      isPresenter: true,
      order: 2
    },
    {
      presentationId: createdPresentations[10].id,
      authorData: {
        name: 'Dr. Lisa Wang',
        email: 'lisa.wang@microsoft.com',
        affiliation: 'Microsoft Research',
        title: 'Dr.'
      },
      isPresenter: true,
      order: 3
    },

    // Robotics presentations
    {
      presentationId: createdPresentations[11].id,
      authorData: {
        name: 'Dr. Robert Kim',
        email: 'robert.kim@robotics.edu',
        affiliation: 'Carnegie Mellon University',
        title: 'Dr.'
      },
      isPresenter: true,
      order: 1
    },
    {
      presentationId: createdPresentations[12].id,
      authorData: {
        name: 'Dr. Emily Zhang',
        email: 'emily.zhang@tesla.com',
        affiliation: 'Tesla AI',
        title: 'Dr.'
      },
      isPresenter: true,
      order: 1
    },
    {
      presentationId: createdPresentations[13].id,
      authorData: {
        name: 'Dr. David Brown',
        email: 'david.brown@manufacturing.com',
        affiliation: 'Boston Dynamics',
        title: 'Dr.'
      },
      isPresenter: true,
      order: 1
    },

    // Ethics Keynote
    {
      presentationId: createdPresentations[14].id,
      authorData: {
        name: 'Dr. Timnit Gebru',
        email: 'timnit@dair-institute.org',
        affiliation: 'DAIR Institute',
        title: 'Dr.'
      },
      isPresenter: true,
      order: 1
    },

    // Future Panel
    {
      presentationId: createdPresentations[15].id,
      authorData: {
        name: 'Satya Nadella',
        email: 'satya@microsoft.com',
        affiliation: 'Microsoft'
      },
      isPresenter: true,
      order: 1
    },
    {
      presentationId: createdPresentations[15].id,
      authorData: {
        name: 'Sundar Pichai',
        email: 'sundar@google.com',
        affiliation: 'Google'
      },
      isPresenter: true,
      order: 2
    },
    {
      presentationId: createdPresentations[15].id,
      authorData: {
        name: 'Sam Altman',
        email: 'sam@openai.com',
        affiliation: 'OpenAI'
      },
      isPresenter: true,
      order: 3
    },

    // Closing Session
    {
      presentationId: createdPresentations[16].id,
      authorData: {
        name: organizer1.name,
        email: organizer1.email,
        affiliation: organizer1.organization,
        userId: organizer1.id
      },
      isPresenter: true,
      order: 1
    },
    {
      presentationId: createdPresentations[16].id,
      authorData: {
        name: organizer2.name,
        email: organizer2.email,
        affiliation: organizer2.organization,
        userId: organizer2.id
      },
      isPresenter: true,
      order: 2
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
        isExternal: !assignment.authorData.userId,
        order: assignment.order,
        userId: assignment.authorData.userId || null, // Use correct field name
        title: assignment.authorData.title || null,
        bio: assignment.authorData.bio || null,
        country: assignment.authorData.country || null
      }
    });
  }

  console.log('👨‍🎓 Created presentation authors');

  // 7. Create attendances (registrations) - using only existing fields
  for (const attendee of attendees) {
    await prisma.attendance.create({
      data: {
        userId: attendee.id,
        conferenceId: conference.id,
        status: 'registered'
        // Removed registeredAt as it's not in your schema
      }
    });
  }

  // Add organizers as attendees too
  await prisma.attendance.create({
    data: {
      userId: organizer1.id,
      conferenceId: conference.id,
      status: 'registered'
    }
  });

  await prisma.attendance.create({
    data: {
      userId: organizer2.id,
      conferenceId: conference.id,
      status: 'registered'
    }
  });

  console.log('🎫 Created attendances');

  // 8. Create some favorites
  const favoriteAssignments = [
    { userId: attendees[0].id, presentationId: createdPresentations[0].id },
    { userId: attendees[0].id, presentationId: createdPresentations[1].id },
    { userId: attendees[0].id, presentationId: createdPresentations[4].id },
    { userId: attendees[1].id, presentationId: createdPresentations[7].id },
    { userId: attendees[1].id, presentationId: createdPresentations[11].id },
    { userId: attendees[2].id, presentationId: createdPresentations[10].id },
    { userId: attendees[2].id, presentationId: createdPresentations[14].id },
  ];

  for (const favorite of favoriteAssignments) {
    await prisma.presentationFavorite.create({
      data: {
        userId: favorite.userId,
        presentationId: favorite.presentationId
      }
    });
  }

  console.log('⭐ Created favorites');

  // 9. Create a few more conferences for discovery
  const additionalConferences = [
    {
      name: 'International Symposium on Robotics 2024',
      description: 'A premier conference focusing on robotics research, autonomous systems, and human-robot interaction.',
      startDate: new Date('2024-09-10T09:00:00Z'),
      endDate: new Date('2024-09-12T17:00:00Z'),
      location: 'Boston, MA, USA',
      venue: 'Boston Convention Center',
      capacity: 800,
      topics: ['Robotics', 'Autonomous Systems', 'Human-Robot Interaction', 'Control Systems'],
      status: ConferenceStatus.published,
      isPublic: true,
      createdById: organizer2.id
    },
    {
      name: 'Computer Vision and Pattern Recognition Conference 2024',
      description: 'Leading conference in computer vision, image processing, and pattern recognition technologies.',
      startDate: new Date('2024-08-20T09:00:00Z'),
      endDate: new Date('2024-08-23T17:00:00Z'),
      location: 'Seattle, WA, USA',
      venue: 'Washington State Convention Center',
      capacity: 1200,
      topics: ['Computer Vision', 'Pattern Recognition', 'Image Processing', 'Deep Learning'],
      status: ConferenceStatus.published,
      isPublic: true,
      createdById: organizer1.id
    },
    {
      name: 'Natural Language Processing Summit 2024',
      description: 'Cutting-edge research in natural language processing, computational linguistics, and language technologies.',
      startDate: new Date('2024-10-05T09:00:00Z'),
      endDate: new Date('2024-10-07T17:00:00Z'),
      location: 'New York, NY, USA',
      venue: 'Jacob Javits Convention Center',
      capacity: 600,
      topics: ['Natural Language Processing', 'Computational Linguistics', 'Language Models', 'Text Mining'],
      status: ConferenceStatus.published,
      isPublic: true,
      createdById: organizer1.id
    }
  ];

  for (const confData of additionalConferences) {
    await prisma.conference.create({
      data: confData
    });
  }

  console.log('🏛️ Created additional conferences for discovery');

  console.log('✅ Seeding completed successfully!');
  console.log(`
📊 Summary:
- Users: ${await prisma.user.count()}
- Conferences: ${await prisma.conference.count()}
- Days: ${await prisma.day.count()}
- Sections: ${await prisma.section.count()}
- Presentations: ${await prisma.presentation.count()}
- Authors: ${await prisma.presentationAuthor.count()}
- Attendances: ${await prisma.attendance.count()}
- Favorites: ${await prisma.presentationFavorite.count()}

🔐 Test Login Credentials:
Admin: admin@conference.com / password123
Organizer 1: sarah.johnson@university.edu / password123
Organizer 2: michael.chen@tech.edu / password123
Attendee 1: alice.williams@student.edu / password123
Attendee 2: bob.rodriguez@company.com / password123
Attendee 3: carol.lee@research.org / password123
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });