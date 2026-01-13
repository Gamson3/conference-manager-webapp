import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Publish schedules for all published conferences
  const result = await prisma.conference.updateMany({
    where: {
      status: 'published',
      isPublic: true,
      schedulePublishedAt: null
    },
    data: {
      schedulePublishedAt: new Date()
    }
  });
  
  console.log(`✅ Published schedules for ${result.count} conference(s)`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
