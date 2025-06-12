// Create: server/prisma/seed-categories.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCategoriesAndTypes() {
  console.log('🏷️ Seeding categories and presentation types...');

  // Find an existing conference
  const conference = await prisma.conference.findFirst({
    where: { status: 'published' }
  });

  if (!conference) {
    console.log('No conference found to add categories to');
    return;
  }

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Artificial Intelligence',
        description: 'Research and applications in AI and machine learning',
        color: '#3B82F6',
        conferenceId: conference.id,
        order: 1
      }
    }),
    prisma.category.create({
      data: {
        name: 'Computer Vision',
        description: 'Image processing, object detection, and visual AI',
        color: '#10B981',
        conferenceId: conference.id,
        order: 2
      }
    }),
    prisma.category.create({
      data: {
        name: 'Natural Language Processing',
        description: 'Text processing, language models, and conversational AI',
        color: '#8B5CF6',
        conferenceId: conference.id,
        order: 3
      }
    })
  ]);

  // Create presentation types
  const presentationTypes = await Promise.all([
    prisma.presentationType.create({
      data: {
        name: 'Full Paper',
        description: 'Complete research presentation with detailed methodology',
        defaultDuration: 20,
        minDuration: 15,
        maxDuration: 25,
        allowsQA: true,
        qaDuration: 5,
        conferenceId: conference.id,
        order: 1
      }
    }),
    prisma.presentationType.create({
      data: {
        name: 'Short Paper',
        description: 'Brief presentation of work in progress',
        defaultDuration: 10,
        minDuration: 8,
        maxDuration: 12,
        allowsQA: true,
        qaDuration: 3,
        conferenceId: conference.id,
        order: 2
      }
    }),
    prisma.presentationType.create({
      data: {
        name: 'Keynote',
        description: 'Invited presentation by distinguished speakers',
        defaultDuration: 45,
        minDuration: 30,
        maxDuration: 60,
        allowsQA: true,
        qaDuration: 15,
        conferenceId: conference.id,
        order: 3
      }
    })
  ]);

  console.log(`✅ Created ${categories.length} categories and ${presentationTypes.length} presentation types`);
}

seedCategoriesAndTypes()
  .catch(console.error)
  .finally(() => prisma.$disconnect());