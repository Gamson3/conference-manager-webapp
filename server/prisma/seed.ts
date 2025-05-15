import { PrismaClient, Prisma } from "@prisma/client";
import fs from "fs";
import path from "path";
// import bcrypt from "bcryptjs"; // Uncomment if using hashed passwords

const prisma = new PrismaClient();

const dataDir = path.join(__dirname, "seedData");

// Models must match exactly what's in Prisma schema (singular, lowercase)
const orderedModels = [
  "user",
  "conference",
  "section",
  "presentation",
  "authorAssignment",
  "attendance",
  "favorite",
  "impersonationLog",
];

async function resetSequence(modelName: string) {
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
}

async function deleteAllData() {
  for (const modelName of [...orderedModels].reverse()) {
    const model = (prisma as any)[modelName];
    if (!model) {
      console.warn(`Model ${modelName} not found in Prisma Client`);
      continue;
    }

    await model.deleteMany({});
    console.log(`Cleared ${modelName}`);
  }
}

async function seedData() {
  for (const modelName of orderedModels) {
    const filePath = path.join(dataDir, `${modelName}.json`);
    if (!fs.existsSync(filePath)) {
      console.warn(`No data file found for ${modelName}`);
      continue;
    }

    const model = (prisma as any)[modelName];
    if (!model) {
      console.error(`Prisma model ${modelName} not found.`);
      continue;
    }

    const jsonData = JSON.parse(fs.readFileSync(filePath, "utf8"));

    try {
      // Special case for hashing user passwords
      if (modelName === "user") {
        for (const user of jsonData) {
          // user.password = await bcrypt.hash(user.password, 10); // Uncomment to hash
          await model.create({ data: user });
        }
      } else {
        for (const item of jsonData) {
          await model.create({ data: item });
        }
      }

      console.log(`Seeded ${modelName}`);
    } catch (error) {
      console.error(`Failed to seed ${modelName}:`, error);
    }

    await resetSequence(modelName);
  }
}

async function main() {
  console.log("Seeding started...");
  await deleteAllData();
  await seedData();
  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
