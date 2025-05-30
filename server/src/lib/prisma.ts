import { PrismaClient } from '@prisma/client';

// Global scoped single, reusable PrismaClient instance
const prisma = new PrismaClient();

export default prisma;