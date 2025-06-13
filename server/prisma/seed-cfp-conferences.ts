import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs'; // Changed from 'bcrypt' to 'bcryptjs'
import { 
  Role, 
  ConferenceStatus, 
  SectionType 
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Call for Papers conference seeding...');

  // Get existing users or create organizers
  let organizers = await prisma.user.findMany({
    where: { role: Role.organizer },
    take: 3
  });

  // Create additional organizers if needed
  const hashedPassword = await bcrypt.hash('Password123##', 12);
  
  if (organizers.length < 3) {
    const newOrganizers = [];
    
    for (let i = organizers.length; i < 3; i++) {
      const organizer = await prisma.user.create({
        data: {
          cognitoId: `cfp-org-${i + 1}-${Date.now()}`,
          name: [
            'Dr. Maria Rodriguez',
            'Prof. James Chen', 
            'Dr. Priya Patel'
          ][i],
          email: [
            'maria.rodriguez@techuni.edu',
            'james.chen@innovatetech.org',
            'priya.patel@globalresearch.net'
          ][i],
          password: hashedPassword,
          role: Role.organizer,
          bio: [
            'Leading researcher in artificial intelligence and machine learning with 15+ years of experience organizing international conferences.',
            'Professor of Computer Science specializing in distributed systems and cloud computing. Conference chair for multiple IEEE events.',
            'Research director focusing on cybersecurity and blockchain technologies. Organizes annual security symposiums.'
          ][i],
          organization: [
            'Tech University',
            'Innovation Institute',
            'Global Research Center'
          ][i],
          jobTitle: [
            'Professor of AI',
            'Research Director',
            'Department Head'
          ][i]
        }
      });
      newOrganizers.push(organizer);
    }
    
    organizers = [...organizers, ...newOrganizers];
  }

  console.log(`👨‍💼 Using ${organizers.length} organizers`);

  // Conference templates that match realistic academic/industry conferences
  const conferenceTemplates = [
    {
      name: 'International Conference on Machine Learning Applications 2024',
      description: `ICMLA 2024 brings together researchers and practitioners to discuss the latest advances in machine learning applications across various domains.

Key Topics:
• Deep Learning and Neural Networks
• Natural Language Processing
• Computer Vision and Image Recognition  
• Reinforcement Learning
• AI Ethics and Fairness
• Industry Applications of ML

Submit your original research, case studies, and innovative applications. We welcome both theoretical contributions and practical implementations.`,
      location: 'San Diego, CA, USA',
      venue: 'San Diego Convention Center',
      capacity: 800,
      topics: ['Machine Learning', 'Deep Learning', 'AI Applications', 'Data Science'],
      startDate: new Date('2024-09-15T09:00:00Z'),
      endDate: new Date('2024-09-17T17:00:00Z'),
      registrationDeadline: new Date('2024-08-15T23:59:59Z'),
      websiteUrl: 'https://icmla2024.conference.org',
      categories: [
        { name: 'Deep Learning', description: 'Neural networks, architectures, optimization' },
        { name: 'Computer Vision', description: 'Image processing, object detection, visual recognition' },
        { name: 'Natural Language Processing', description: 'Text analysis, language models, sentiment analysis' },
        { name: 'Reinforcement Learning', description: 'Agent-based learning, policy optimization' },
        { name: 'AI Ethics', description: 'Fairness, bias, responsible AI development' }
      ],
      presentationTypes: [
        { name: 'Full Paper Presentation', description: 'Complete research paper presentation', defaultDuration: 20, minDuration: 18, maxDuration: 25 },
        { name: 'Short Paper Presentation', description: 'Work-in-progress or preliminary results', defaultDuration: 15, minDuration: 12, maxDuration: 18 },
        { name: 'Poster Session', description: 'Visual presentation with discussion', defaultDuration: 90, minDuration: 60, maxDuration: 120 },
        { name: 'Demo Session', description: 'Live demonstration of systems', defaultDuration: 10, minDuration: 8, maxDuration: 15 }
      ],
      submissionSettings: {
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
        allowDurationRequest: false,
        submissionGuidelines: 'Papers should be 6-12 pages in IEEE format. Include experimental results and comparison with existing methods.',
        authorGuidelines: 'All authors must be listed with full affiliations. At least one author must register for the conference.',
        reviewCriteria: 'Technical quality, novelty, experimental validation, and clarity of presentation.'
      }
    },

    {
      name: 'International Symposium on Cybersecurity and Privacy 2024',
      description: `ISCP 2024 focuses on cutting-edge research in cybersecurity, privacy protection, and digital forensics.

Call for Papers:
• Network Security and Intrusion Detection
• Cryptography and Blockchain Technologies
• Privacy-Preserving Technologies
• Digital Forensics and Incident Response
• IoT and Mobile Security
• Security Policy and Risk Management

We invite researchers, practitioners, and graduate students to submit their latest findings and innovative solutions.`,
      location: 'London, UK',
      venue: 'ExCeL London',
      capacity: 600,
      topics: ['Cybersecurity', 'Privacy', 'Blockchain', 'Digital Forensics'],
      startDate: new Date('2024-10-20T09:00:00Z'),
      endDate: new Date('2024-10-22T17:00:00Z'),
      registrationDeadline: new Date('2024-09-20T23:59:59Z'),
      websiteUrl: 'https://iscp2024.security.org',
      categories: [
        { name: 'Network Security', description: 'Firewalls, IDS/IPS, network protocols security' },
        { name: 'Cryptography', description: 'Encryption algorithms, key management, quantum cryptography' },
        { name: 'Blockchain & DLT', description: 'Distributed ledger technologies, smart contracts' },
        { name: 'Privacy Technologies', description: 'Data anonymization, differential privacy' },
        { name: 'Digital Forensics', description: 'Evidence collection, analysis techniques' },
        { name: 'IoT Security', description: 'Internet of Things security challenges' }
      ],
      presentationTypes: [
        { name: 'Research Paper', description: 'Original research contribution', defaultDuration: 25, minDuration: 20, maxDuration: 30 },
        { name: 'Industry Track', description: 'Practical industry experiences', defaultDuration: 20, minDuration: 15, maxDuration: 25 },
        { name: 'Workshop Presentation', description: 'Interactive workshop session', defaultDuration: 45, minDuration: 30, maxDuration: 60 },
        { name: 'Panel Discussion', description: 'Expert panel on trending topics', defaultDuration: 60, minDuration: 45, maxDuration: 90 }
      ],
      submissionSettings: {
        submissionDeadline: new Date('2024-08-10T23:59:59Z'),
        allowLateSubmissions: false,
        requireAbstract: true,
        maxAbstractLength: 300,
        requireFullPaper: true,
        allowedFileTypes: ['pdf'],
        maxFileSize: 15,
        requireAuthorBio: true,
        requireAffiliation: true,
        maxCoAuthors: 6,
        requirePresenterDesignation: true,
        requireKeywords: true,
        minKeywords: 4,
        maxKeywords: 8,
        requirePresentationType: true,
        allowDurationRequest: true,
        submissionGuidelines: 'Submissions must be original work not published elsewhere. Use ACM format for all submissions.',
        authorGuidelines: 'Include complete author information and conflict of interest statements.',
        reviewCriteria: 'Originality, technical soundness, practical significance, and presentation quality.'
      }
    },

    {
      name: 'International Conference on Sustainable Computing 2024',
      description: `ICSC 2024 explores the intersection of computing technologies and environmental sustainability.

Research Areas:
• Green Computing and Energy Efficiency
• Sustainable Software Engineering
• Carbon-Aware Computing Systems
• Renewable Energy in Data Centers
• E-Waste and Circular Economy
• Environmental Impact Assessment

Join researchers, industry leaders, and policymakers in addressing computing's environmental challenges.`,
      location: 'Copenhagen, Denmark',
      venue: 'Bella Center Copenhagen',
      capacity: 450,
      topics: ['Green Computing', 'Sustainability', 'Energy Efficiency', 'Environmental Technology'],
      startDate: new Date('2024-11-12T09:00:00Z'),
      endDate: new Date('2024-11-14T17:00:00Z'),
      registrationDeadline: new Date('2024-10-12T23:59:59Z'),
      websiteUrl: 'https://icsc2024.greentech.org',
      categories: [
        { name: 'Green Computing', description: 'Energy-efficient computing systems and algorithms' },
        { name: 'Sustainable Software', description: 'Software engineering for sustainability' },
        { name: 'Data Center Efficiency', description: 'Optimizing data center operations' },
        { name: 'Renewable Energy', description: 'Integration of renewable energy sources' },
        { name: 'Policy & Governance', description: 'Environmental policies for computing' }
      ],
      presentationTypes: [
        { name: 'Technical Paper', description: 'Technical research presentation', defaultDuration: 18, minDuration: 15, maxDuration: 22 },
        { name: 'Position Paper', description: 'Vision and position statements', defaultDuration: 12, minDuration: 10, maxDuration: 15 },
        { name: 'Case Study', description: 'Real-world implementation case studies', defaultDuration: 15, minDuration: 12, maxDuration: 20 },
        { name: 'Lightning Talk', description: 'Quick presentation of ideas', defaultDuration: 5, minDuration: 3, maxDuration: 8 }
      ],
      submissionSettings: {
        submissionDeadline: new Date('2024-08-25T23:59:59Z'),
        allowLateSubmissions: true,
        requireAbstract: true,
        maxAbstractLength: 400,
        requireFullPaper: false,
        allowedFileTypes: ['pdf', 'doc', 'docx'],
        maxFileSize: 20,
        requireAuthorBio: false,
        requireAffiliation: true,
        maxCoAuthors: 10,
        requirePresenterDesignation: true,
        requireKeywords: true,
        minKeywords: 3,
        maxKeywords: 12,
        requirePresentationType: true,
        allowDurationRequest: true,
        submissionGuidelines: 'Extended abstracts (4-6 pages) are acceptable. Focus on environmental impact and sustainability metrics.',
        authorGuidelines: 'Encourage submissions from industry practitioners and policy makers.',
        reviewCriteria: 'Environmental relevance, innovation, feasibility, and potential impact.'
      }
    },

    {
      name: 'Workshop on Human-Computer Interaction in Healthcare 2024',
      description: `HCIH 2024 brings together HCI researchers and healthcare professionals to explore innovative interfaces and technologies.

Topics of Interest:
• Medical Device User Interfaces
• Patient-Centered Design
• Telemedicine and Remote Care
• Accessibility in Healthcare Technology
• Clinical Decision Support Systems
• Health Information Visualization

Submit your research on improving healthcare through better technology design.`,
      location: 'Toronto, Canada',
      venue: 'Metro Toronto Convention Centre',
      capacity: 250,
      topics: ['Human-Computer Interaction', 'Healthcare Technology', 'Medical Interfaces', 'Patient Care'],
      startDate: new Date('2024-08-08T09:00:00Z'),
      endDate: new Date('2024-08-09T17:00:00Z'),
      registrationDeadline: new Date('2024-07-20T23:59:59Z'),
      websiteUrl: 'https://hcih2024.healthtech.ca',
      categories: [
        { name: 'Medical Interfaces', description: 'User interfaces for medical devices and systems' },
        { name: 'Patient Experience', description: 'Patient-centered design and usability' },
        { name: 'Clinical Workflows', description: 'Technology integration in clinical settings' },
        { name: 'Accessibility', description: 'Inclusive design for diverse populations' },
        { name: 'Data Visualization', description: 'Health data presentation and interpretation' }
      ],
      presentationTypes: [
        { name: 'Work-in-Progress', description: 'Ongoing research presentation', defaultDuration: 10, minDuration: 8, maxDuration: 12 },
        { name: 'Design Case Study', description: 'Design process and outcomes', defaultDuration: 15, minDuration: 12, maxDuration: 18 },
        { name: 'Demo Session', description: 'Interactive system demonstration', defaultDuration: 20, minDuration: 15, maxDuration: 25 },
        { name: 'Position Statement', description: 'Viewpoint or opinion presentation', defaultDuration: 8, minDuration: 5, maxDuration: 10 }
      ],
      submissionSettings: {
        submissionDeadline: new Date('2024-06-15T23:59:59Z'),
        allowLateSubmissions: true,
        requireAbstract: true,
        maxAbstractLength: 250,
        requireFullPaper: false,
        allowedFileTypes: ['pdf', 'doc', 'docx'],
        maxFileSize: 10,
        requireAuthorBio: true,
        requireAffiliation: true,
        maxCoAuthors: 5,
        requirePresenterDesignation: true,
        requireKeywords: true,
        minKeywords: 2,
        maxKeywords: 6,
        requirePresentationType: true,
        allowDurationRequest: false,
        submissionGuidelines: 'Short papers (2-4 pages) preferred. Include user study results or design rationale.',
        authorGuidelines: 'Multidisciplinary teams encouraged. Include healthcare professional perspectives.',
        reviewCriteria: 'Healthcare relevance, user-centered approach, design quality, and evaluation rigor.'
      }
    },

    {
      name: 'International Conference on Educational Technology and Learning Analytics 2024',
      description: `ICETLA 2024 explores the transformative role of technology in education and learning sciences.

Research Themes:
• Learning Management Systems
• Educational Data Mining
• Adaptive Learning Technologies
• Virtual and Augmented Reality in Education
• AI-Powered Tutoring Systems
• Student Engagement Analytics

We welcome educators, technologists, and researchers to share innovations in educational technology.`,
      location: 'Melbourne, Australia',
      venue: 'Melbourne Convention and Exhibition Centre',
      capacity: 700,
      topics: ['Educational Technology', 'Learning Analytics', 'AI in Education', 'E-Learning'],
      startDate: new Date('2024-12-05T09:00:00Z'),
      endDate: new Date('2024-12-07T17:00:00Z'),
      registrationDeadline: new Date('2024-11-05T23:59:59Z'),
      websiteUrl: 'https://icetla2024.edtech.edu.au',
      categories: [
        { name: 'Learning Analytics', description: 'Data-driven insights into learning processes' },
        { name: 'Adaptive Systems', description: 'Personalized learning technologies' },
        { name: 'VR/AR in Education', description: 'Immersive learning experiences' },
        { name: 'AI Tutoring', description: 'Intelligent tutoring and assessment systems' },
        { name: 'Educational Games', description: 'Gamification and serious games' },
        { name: 'Accessibility', description: 'Inclusive educational technologies' }
      ],
      presentationTypes: [
        { name: 'Full Research Paper', description: 'Complete research study', defaultDuration: 20, minDuration: 18, maxDuration: 25 },
        { name: 'Experience Report', description: 'Implementation experiences', defaultDuration: 15, minDuration: 12, maxDuration: 18 },
        { name: 'Technology Demo', description: 'Educational technology demonstration', defaultDuration: 25, minDuration: 20, maxDuration: 30 },
        { name: 'Poster Presentation', description: 'Visual research presentation', defaultDuration: 120, minDuration: 90, maxDuration: 150 }
      ],
      submissionSettings: {
        submissionDeadline: new Date('2024-09-01T23:59:59Z'),
        allowLateSubmissions: false,
        requireAbstract: true,
        maxAbstractLength: 350,
        requireFullPaper: true,
        allowedFileTypes: ['pdf', 'doc', 'docx'],
        maxFileSize: 30,
        requireAuthorBio: true,
        requireAffiliation: true,
        maxCoAuthors: 12,
        requirePresenterDesignation: true,
        requireKeywords: true,
        minKeywords: 4,
        maxKeywords: 10,
        requirePresentationType: true,
        allowDurationRequest: true,
        submissionGuidelines: 'Include pedagogical theory, system description, and evaluation results. Papers should be 8-15 pages.',
        authorGuidelines: 'Encourage collaboration between educators and technologists.',
        reviewCriteria: 'Educational impact, technical innovation, evaluation methodology, and scalability.'
      }
    }
  ];

  console.log(`🏛️ Creating ${conferenceTemplates.length} call-for-papers conferences...`);

  const createdConferences = [];

  for (let i = 0; i < conferenceTemplates.length; i++) {
    const template = conferenceTemplates[i];
    const organizer = organizers[i % organizers.length];

    console.log(`📝 Creating conference: ${template.name}`);

    // Create the conference
    const conference = await prisma.conference.create({
      data: {
        name: template.name,
        description: template.description,
        startDate: template.startDate,
        endDate: template.endDate,
        location: template.location,
        venue: template.venue,
        capacity: template.capacity,
        topics: template.topics,
        status: ConferenceStatus.call_for_papers, // This is key!
        isPublic: true,
        websiteUrl: template.websiteUrl,
        registrationDeadline: template.registrationDeadline,
        createdById: organizer.id,
        workflowStep: 5, // Completed setup
        workflowStatus: 'completed'
      }
    });

    // Create submission settings
    await prisma.submissionSettings.create({
      data: {
        conferenceId: conference.id,
        ...template.submissionSettings
      }
    });

    // Create categories
    const categoryPromises = template.categories.map((cat, index) =>
      prisma.category.create({
        data: {
          name: cat.name,
          description: cat.description,
          conferenceId: conference.id,
          order: index + 1
        }
      })
    );
    await Promise.all(categoryPromises);

    // Create presentation types with correct field names
    const typePromises = template.presentationTypes.map((type, index) =>
      prisma.presentationType.create({
        data: {
          name: type.name,
          description: type.description,
          defaultDuration: type.defaultDuration, // Fixed: was 'duration'
          minDuration: type.minDuration,
          maxDuration: type.maxDuration,
          allowsQA: true,
          qaDuration: 5,
          conferenceId: conference.id,
          order: index + 1
        }
      })
    );
    await Promise.all(typePromises);

    // Create basic conference structure (days and sections for testing)
    const day1 = await prisma.day.create({
      data: {
        name: 'Day 1',
        date: template.startDate,
        order: 1,
        conferenceId: conference.id
      }
    });

    // Create a general session for submissions
    await prisma.section.create({
      data: {
        name: 'General Session',
        description: 'Main presentation session',
        startTime: new Date(template.startDate.getTime() + 2 * 60 * 60 * 1000), // 2 hours after start
        endTime: new Date(template.startDate.getTime() + 5 * 60 * 60 * 1000), // 5 hours after start
        room: 'Main Hall',
        capacity: template.capacity,
        type: SectionType.presentation,
        order: 1,
        dayId: day1.id,
        conferenceId: conference.id
      }
    });

    createdConferences.push(conference);
    console.log(`✅ Created: ${conference.name} (ID: ${conference.id})`);
  }

  // Create some test attendees if they don't exist
  const attendeeCount = await prisma.user.count({
    where: { role: Role.attendee }
  });

  if (attendeeCount < 5) {
    console.log('👥 Creating test attendees...');
    
    const testAttendees = [
      {
        name: 'Dr. Alex Johnson',
        email: 'alex.johnson@university.edu',
        organization: 'Research University',
        jobTitle: 'Assistant Professor',
        bio: 'Early career researcher in machine learning and data science.'
      },
      {
        name: 'Sarah Chen',
        email: 'sarah.chen@techcorp.com',
        organization: 'TechCorp Inc.',
        jobTitle: 'Senior Developer',
        bio: 'Industry practitioner with expertise in software engineering and AI applications.'
      },
      {
        name: 'Dr. Michael Brown',
        email: 'michael.brown@research.org',
        organization: 'Global Research Institute',
        jobTitle: 'Research Scientist',
        bio: 'Experienced researcher in cybersecurity and privacy technologies.'
      },
      {
        name: 'Emily Davis',
        email: 'emily.davis@startup.io',
        organization: 'InnovateTech Startup',
        jobTitle: 'CTO',
        bio: 'Technology entrepreneur focused on sustainable computing solutions.'
      },
      {
        name: 'Prof. David Wilson',
        email: 'david.wilson@college.edu',
        organization: 'Teaching College',
        jobTitle: 'Professor of Computer Science',
        bio: 'Educator and researcher specializing in human-computer interaction.'
      }
    ];

    for (let i = 0; i < testAttendees.length; i++) {
      const attendee = testAttendees[i];
      await prisma.user.create({
        data: {
          cognitoId: `test-attendee-${i + 1}-${Date.now()}`,
          name: attendee.name,
          email: attendee.email,
          password: hashedPassword,
          role: Role.attendee,
          organization: attendee.organization,
          jobTitle: attendee.jobTitle,
          bio: attendee.bio
        }
      });
    }

    console.log(`✅ Created ${testAttendees.length} test attendees`);
  }

  console.log('\n🎉 Call for Papers seeding completed successfully!');
  console.log(`
📊 Summary:
- Conferences created: ${createdConferences.length}
- All conferences are in "call_for_papers" status
- Each conference has submission settings, categories, and presentation types
- Total users: ${await prisma.user.count()}
- Total conferences: ${await prisma.conference.count()}

🎯 Ready for testing:
- Presenters can discover these conferences
- Submit presentations with various requirements
- Upload materials (PDF, DOC, DOCX)
- Track submission status
- Test different submission settings per conference

🔐 Test Login Credentials:
All users: Password123##

Organizers:
- maria.rodriguez@techuni.edu
- james.chen@innovatetech.org  
- priya.patel@globalresearch.net

Attendees:
- alex.johnson@university.edu
- sarah.chen@techcorp.com
- michael.brown@research.org
- emily.davis@startup.io
- david.wilson@college.edu
  `);
}

main()
  .catch((e) => {
    console.error('Error seeding call for papers data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });