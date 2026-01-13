import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('🧹 Starting database cleanup...');

  try {
    // Delete in correct order (children first, then parents)
    await prisma.presentationFavorite.deleteMany({});
    console.log('✅ Deleted presentation favorites');
    
    await prisma.conferenceFavorite.deleteMany({});
    console.log('✅ Deleted conference favorites');
    
  await prisma.sessionAttendance.deleteMany({});
  console.log('✅ Deleted session attendances');
    
  await prisma.conferenceParticipant.deleteMany({});
  console.log('✅ Deleted conference participants');
    
    await prisma.presentationAuthor.deleteMany({});
    console.log('✅ Deleted presentation authors');
    
    await prisma.authorAssignment.deleteMany({});
    console.log('✅ Deleted author assignments');
    
  // Legacy abstract models removed in refined schema; skip
  // (AbstractReview / AbstractSubmission no longer exist)
    
  await prisma.presentation.deleteMany({});
  console.log('✅ Deleted presentations');
    
    await prisma.conferenceMaterial.deleteMany({});
    console.log('✅ Deleted conference materials');
    
    await prisma.conferenceFeedback.deleteMany({});
    console.log('✅ Deleted conference feedback');
    
    // Add missing tables that reference Presentation
    await prisma.presentationMaterial.deleteMany({});
    console.log('✅ Deleted presentation materials');
    
    await prisma.presentationFeedback.deleteMany({});
    console.log('✅ Deleted presentation feedback');
    
    await prisma.section.deleteMany({});
    console.log('✅ Deleted sections');
    
    await prisma.day.deleteMany({});
    console.log('✅ Deleted days');
    
    await prisma.conference.deleteMany({});
    console.log('✅ Deleted conferences');
    
    // Add ALL tables that reference User (before deleting User)
    await prisma.impersonationLog.deleteMany({});
    console.log('✅ Deleted impersonation logs');
    
    await prisma.notification.deleteMany({});
    console.log('✅ Deleted notifications');
    
    await prisma.user.deleteMany({});
    console.log('✅ Deleted users');

    console.log('🎉 Database cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

clearDatabase()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });