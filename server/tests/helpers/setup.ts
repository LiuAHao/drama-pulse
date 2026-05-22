import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll } from 'vitest';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Ensure seed data exists
  const dramaCount = await prisma.drama.count();
  if (dramaCount === 0) {
    throw new Error('No seed data found. Run: pnpm prisma:seed');
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
