import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll } from 'vitest';
import { TEST_DATABASE_URL } from './app.js';

const prisma = new PrismaClient({
  datasources: {
    db: { url: TEST_DATABASE_URL },
  },
});

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
