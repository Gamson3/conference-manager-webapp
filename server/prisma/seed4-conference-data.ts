import { PrismaClient, Role, ConferenceStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');
  
  // Create test users if they don't exist
  const adminUser = await createUserIfNotExists('admin@example.com', 'admin', ['admin', 'organizer']);
  const organizerUser = await createUserIfNotExists('organizer@example.com', 'organizer', ['organizer']);
  const attendeeUser = await createUserIfNotExists('attendee@example.com', 'attendee', ['attendee']);
  
  // Create conferences
  await createTestConferences(organizerUser.id, 10);
  
  console.log('Seed completed successfully');
}

async function createUserIfNotExists(email: string, name: string, roles: string[]) {
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });
  
  if (existingUser) {
    console.log(`User ${email} already exists`);
    return existingUser;
  }
  
  return prisma.user.create({
    data: {
      email,
      name,
      password: '', // No password needed for Cognito users
      cognitoId: faker.string.uuid(),
      roles: roles as Role[]
    }
  });
}

async function createTestConferences(organizerId: number, count: number) {
  const categories = [
    { name: 'Technology', color: '#3B82F6' },
    { name: 'Science', color: '#10B981' },
    { name: 'Business', color: '#F59E0B' },
    { name: 'Arts', color: '#EC4899' },
    { name: 'Education', color: '#8B5CF6' },
    { name: 'Healthcare', color: '#06B6D4' }
  ];
  
  const presentationTypes = [
    { name: 'Keynote', defaultDuration: 45, minDuration: 30, maxDuration: 60 },
    { name: 'Workshop', defaultDuration: 90, minDuration: 60, maxDuration: 120 },
    { name: 'Panel Discussion', defaultDuration: 60, minDuration: 45, maxDuration: 90 },
    { name: 'Lightning Talk', defaultDuration: 10, minDuration: 5, maxDuration: 15 },
    { name: 'Paper Presentation', defaultDuration: 20, minDuration: 15, maxDuration: 30 }
  ];
  
  for (let i = 0; i < count; i++) {
    // Generate random dates for the conference
    const startDate = faker.date.future();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + faker.number.int({ min: 1, max: 5 })); // 1-5 days conference
    
    const conferenceName = `${faker.company.name()} ${faker.word.words({ count: { min: 1, max: 2 } })} Conference`;
    
    console.log(`Creating conference: ${conferenceName}`);
    
    // Create the conference
    const conference = await prisma.conference.create({
      data: {
        name: conferenceName,
        description: faker.lorem.paragraphs(3),
        startDate,
        endDate,
        location: `${faker.location.city()}, ${faker.location.country()}`,
        venue: faker.company.name() + ' Convention Center',
        venueAddress: faker.location.streetAddress(),
        isPublic: true,
        status: ConferenceStatus.published,
        topics: [faker.word.noun(), faker.word.adjective(), faker.word.noun()],
        createdById: organizerId,
        websiteUrl: faker.internet.url(),
        bannerImageUrl: `https://source.unsplash.com/random/1200x400/?conference,${i}`,
        
        // Create categories for this conference
        categories: {
          create: categories.slice(0, faker.number.int({ min: 2, max: 4 })).map(cat => ({
            name: cat.name,
            color: cat.color,
            description: faker.lorem.sentence()
          }))
        },
        
        // Create presentation types for this conference
        presentationTypes: {
          create: presentationTypes.slice(0, faker.number.int({ min: 2, max: 5 })).map(type => ({
            name: type.name,
            description: faker.lorem.sentence(),
            defaultDuration: type.defaultDuration,
            minDuration: type.minDuration,
            maxDuration: type.maxDuration,
            allowsQA: faker.datatype.boolean(),
            qaDuration: 5
          }))
        }
      }
    });
    
    // Create days for the conference
    const days = [];
    let currentDate = new Date(startDate);
    let dayCount = 1;
    
    while (currentDate <= endDate) {
      days.push(await prisma.day.create({
        data: {
          conferenceId: conference.id,
          date: new Date(currentDate),
          name: `Day ${dayCount}`,
          order: dayCount
        }
      }));
      
      currentDate.setDate(currentDate.getDate() + 1);
      dayCount++;
    }
    
    // Get categories and presentation types for this conference
    const conferenceCategories = await prisma.category.findMany({
      where: { conferenceId: conference.id }
    });
    
    const conferencePresentationTypes = await prisma.presentationType.findMany({
      where: { conferenceId: conference.id }
    });
    
    // Create sections and time slots for each day
    for (const day of days) {
      const sectionCount = faker.number.int({ min: 2, max: 5 });
      
      for (let s = 0; s < sectionCount; s++) {
        // Start time between 8 AM and 2 PM
        const startHour = 8 + s * 2;
        const sectionStartTime = new Date(day.date);
        sectionStartTime.setHours(startHour, 0, 0, 0);
        
        // End time 1-3 hours after start
        const sectionEndTime = new Date(sectionStartTime);
        sectionEndTime.setHours(sectionStartTime.getHours() + faker.number.int({ min: 1, max: 3 }));
        
        const section = await prisma.section.create({
          data: {
            conferenceId: conference.id,
            dayId: day.id,
            name: faker.word.words({ count: { min: 2, max: 5 } }),
            startTime: sectionStartTime,
            endTime: sectionEndTime,
            room: `Room ${faker.string.alpha({ casing: 'upper' })}${faker.number.int(100)}`,
            capacity: faker.number.int({ min: 30, max: 200 }),
            order: s + 1,
            type: 'presentation',
            categoryId: faker.helpers.arrayElement(conferenceCategories).id
          }
        });
        
        // Create time slots for this section
        let currentSlotTime = new Date(sectionStartTime);
        let slotOrder = 1;
        
        while (currentSlotTime < sectionEndTime) {
          // Every third slot is a break
          const isBreak = slotOrder % 3 === 0;
          
          // Duration: 20-40 minutes for presentations, 15-30 minutes for breaks
          const slotDuration = isBreak 
            ? faker.number.int({ min: 15, max: 30 }) 
            : faker.number.int({ min: 20, max: 40 });
          
          const slotEndTime = new Date(currentSlotTime);
          slotEndTime.setMinutes(currentSlotTime.getMinutes() + slotDuration);
          
          if (slotEndTime > sectionEndTime) {
            break; // Don't create slots beyond section end time
          }
          
          if (isBreak) {
            // Create a break slot
            await prisma.timeSlot.create({
              data: {
                sectionId: section.id,
                startTime: currentSlotTime,
                endTime: slotEndTime,
                slotType: 'BREAK',
                order: slotOrder,
                isFixed: true,
                breakType: faker.helpers.arrayElement(['COFFEE_BREAK', 'LUNCH_BREAK', 'NETWORKING_BREAK']),
                title: faker.helpers.arrayElement(['Coffee Break', 'Lunch', 'Networking Session', 'Refreshments']),
                description: faker.lorem.sentence()
              }
            });
          } else {
            // Create a presentation slot
            const presentationType = faker.helpers.arrayElement(conferencePresentationTypes);
            
            // Create a presentation
            const presentation = await prisma.presentation.create({
              data: {
                conferenceId: conference.id,
                title: faker.lorem.sentence(),
                abstract: faker.lorem.paragraphs(2),
                status: 'scheduled',
                submissionType: 'internal',
                categoryId: faker.helpers.arrayElement(conferenceCategories).id,
                presentationTypeId: presentationType.id,
                duration: slotDuration,
                keywords: Array.from({ length: 5 }, () => faker.word.noun())
              }
            });
            
            // Create authors for the presentation
            const authorCount = faker.number.int({ min: 1, max: 3 });
            for (let a = 0; a < authorCount; a++) {
              await prisma.presentationAuthor.create({
                data: {
                  presentationId: presentation.id,
                  authorName: faker.person.fullName(),
                  authorEmail: faker.internet.email(),
                  affiliation: faker.company.name() + ' University',
                  isPresenter: a === 0, // First author is the presenter
                  order: a + 1
                }
              });
            }
            
            // Create the time slot and assign the presentation
            await prisma.timeSlot.create({
              data: {
                sectionId: section.id,
                startTime: currentSlotTime,
                endTime: slotEndTime,
                slotType: 'PRESENTATION',
                order: slotOrder,
                isOccupied: true,
                presentationId: presentation.id
              }
            });
          }
          
          // Move to the next slot
          currentSlotTime = slotEndTime;
          slotOrder++;
        }
      }
    }
    
    // Create some conference materials
    const materialCount = faker.number.int({ min: 2, max: 5 });
    for (let m = 0; m < materialCount; m++) {
      await prisma.conferenceMaterial.create({
        data: {
          conferenceId: conference.id,
          title: faker.word.words({ count: { min: 3, max: 6 } }),
          description: faker.lorem.sentence(),
          fileUrl: faker.internet.url(),
          fileType: faker.helpers.arrayElement(['pdf', 'pptx', 'docx']),
          isPublic: true
        }
      });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });