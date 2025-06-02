import { Prisma, PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const dataDir = path.join(__dirname, "seedData");

// For initial testing, only seed core models
const orderedModels = [
  "user",
  "conference",
  "conferenceFavorite",
  "day",
  "section",
  "abstractSubmission",
  "abstractReview",
  "presentation",
  "presentationAuthor", // Add this
  "presentationFavorite",
  "authorAssignment",
  "attendance",
  "sessionAttendance",
  "conferenceMaterial",
  "presentationMaterial",
  "conferenceFeedback",
  "presentationFeedback",
  "notification",
  "impersonationLog",
];

// Add this function to verify each model's records exist
async function verifySeededData(modelName: string) {
  try {
    const result = await (prisma as any)[modelName].findMany();
    console.log(`✓ ${modelName} verification: ${result.length} records exist`);
    
    if (result.length === 0) {
      console.error(`⚠️ WARNING: No ${modelName} records were created!`);
    }
    
    return result.length > 0;
  } catch (error) {
    console.error(`Failed to verify ${modelName}:`, error);
    return false;
  }
}

// Enhanced data preparation with better type handling
function prepareDataForPrisma(data: any, modelName: string) {
  // Clone to avoid modifying original
  const prepared = JSON.parse(JSON.stringify(data));
  
  // Handle date fields
  const dateFields = [
    'startDate', 'endDate', 'createdAt', 'updatedAt', 'submissionDate',
    'startTime', 'endTime', 'checkInTime', 'checkinTime', 'timestamp',
    'purchaseDate', 'availableFrom', 'availableTo', 'date',
    'submittedAt', 'registrationDeadline', 'uploadedAt'
  ];
  
  dateFields.forEach(field => {
    if (prepared[field] && typeof prepared[field] === 'string') {
      prepared[field] = new Date(prepared[field]);
    }
  });

  // Handle arrays and JSON fields
  if (modelName === 'conference' && prepared.topics) {
    if (typeof prepared.topics === 'string') {
      prepared.topics = prepared.topics.split(',').map((t: string) => t.trim());
    }
    // Make sure it's an array even if it comes from JSON
    if (prepared.topics && !Array.isArray(prepared.topics)) {
      prepared.topics = [prepared.topics];
    }
  }

  if (modelName === 'presentation') {
    // Handle affiliations array
    if (prepared.affiliations && !Array.isArray(prepared.affiliations)) {
      prepared.affiliations = typeof prepared.affiliations === 'string' 
        ? prepared.affiliations.split(',').map((a: string) => a.trim())
        : [prepared.affiliations];
    }
    
    // Handle keywords array
    if (prepared.keywords && !Array.isArray(prepared.keywords)) {
      prepared.keywords = typeof prepared.keywords === 'string'
        ? prepared.keywords.split(',').map((k: string) => k.trim())
        : [prepared.keywords];
    }
  }

  // Handle JSON fields in user
  if (modelName === 'user' && prepared.socialLinks && typeof prepared.socialLinks === 'string') {
    try {
      prepared.socialLinks = JSON.parse(prepared.socialLinks);
    } catch (e) {
      console.warn(`Failed to parse socialLinks for user ${prepared.id}: ${e}`);
      prepared.socialLinks = {};
    }
  }

  return prepared;
}

async function resetSequence(modelName: string) {
  try {
    const quoted = `"${modelName.charAt(0).toUpperCase() + modelName.slice(1)}"`;

    const result = await (prisma[modelName as keyof PrismaClient] as any).findMany({
      select: { id: true },
      orderBy: { id: "desc" },
      take: 1,
    });

    if (result.length === 0) return;

    const nextId = result[0].id + 1;

    await prisma.$executeRaw(
      Prisma.raw(`
        SELECT setval(pg_get_serial_sequence('${quoted}', 'id'), coalesce(max(id)+1, ${nextId}), false) FROM ${quoted};
      `)
    );

    console.log(`Sequence reset for ${modelName}`);
  } catch (error) {
    console.error(`Error resetting sequence for ${modelName}:`, error);
  }
}

async function deleteAllData() {
  for (const modelName of [...orderedModels].reverse()) {
    const model = (prisma as any)[modelName];
    if (!model) {
      console.warn(`Model ${modelName} not found in Prisma Client`);
      continue;
    }

    try {
      await model.deleteMany({});
      console.log(`Cleared ${modelName}`);
    } catch (error) {
      console.error(`Error clearing ${modelName}:`, error);
    }
  }
}

async function seedData() {
  for (const modelName of orderedModels) {
    const filePath = path.join(dataDir, `${modelName}.json`);
    
    if (!fs.existsSync(filePath)) {
      console.error(`⚠️ No data file found for ${modelName}`);
      continue;
    }
    
    const model = (prisma as any)[modelName];
    if (!model) {
      console.error(`⚠️ Prisma model ${modelName} not found.`);
      continue;
    }
    
    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      if (!fileContent || fileContent.trim() === "[]" || fileContent.trim() === "") {
        console.error(`⚠️ Empty seed data file for ${modelName}`);
        continue;
      }
      
      console.log(`Processing ${modelName} data...`);
      const jsonData = JSON.parse(fileContent);
      
      if (!Array.isArray(jsonData) || jsonData.length === 0) {
        console.error(`⚠️ No items in ${modelName}.json`);
        continue;
      }
      
      let seededCount = 0;

      // Special case for hashing user passwords
      if (modelName === "user") {
        for (const user of jsonData) {
          try {
            // Uncomment the next line if you want to hash passwords
            // user.password = await bcrypt.hash(user.password, 10);
            await model.create({ data: prepareDataForPrisma(user, modelName) });
            seededCount++;
          } catch (error) {
            console.error(`Failed to seed user ${user.id}:`, error);
          }
        }
      } else {
        for (const item of jsonData) {
          try {
            const preparedData = prepareDataForPrisma(item, modelName);
            await model.create({ data: preparedData });
            seededCount++;
          } catch (error) {
            console.error(`Failed to seed ${modelName} with id ${item.id}:`, error);
            console.error('Data causing the error:', JSON.stringify(item, null, 2));
          }
        }
      }

      console.log(`Seeded ${seededCount}/${jsonData.length} ${modelName} records`);
      await resetSequence(modelName);
    } catch (error) {
      console.error(`Error processing ${modelName}:`, error);
    }
    
    // Verify that seeding worked before moving to next model
    const success = await verifySeededData(modelName);
    if (!success) {
      console.error(`⚠️ Stopping seed process as ${modelName} failed to seed properly`);
      break; // Stop the process if a core model fails
    }
  }
}

async function main() {
  try {
    console.log("Seeding started...");
    console.log("Database: ", process.env.DATABASE_URL?.split('@')[1] || 'unknown');
    
    console.log("Step 1: Clearing existing data...");
    await deleteAllData();
    
    console.log("Step 2: Seeding new data...");
    await seedData();
    
    console.log("Seeding completed successfully!");
  } catch (error) {
    console.error("Fatal seeding error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run with more detailed error stacks
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  });
