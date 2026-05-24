import fs from 'fs';
import path from 'path';
import { FastifyInstance } from 'fastify';

const serverRoot = path.resolve(import.meta.dirname, '../..');
const runtimeDbPath = path.join(serverRoot, 'data', 'app.db');
const testDbPath = path.join(serverRoot, 'data', 'test.app.db');
export const TEST_DATABASE_URL = 'file:../data/test.app.db';

if (fs.existsSync(runtimeDbPath)) {
  fs.copyFileSync(runtimeDbPath, testDbPath);
}

process.env.ADMIN_TOKEN = 'test-admin-token';
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.HOST = 'localhost';
process.env.PORT = '8787';
process.env.VIDEOS_ROOT = '../videos';
process.env.ASSETS_ROOT = '../assets';
process.env.EXPORTS_ROOT = '../data/exports';

async function seedTestDatabase() {
  const { PrismaClient } = await import('@prisma/client');
  const { seedDatabase } = await import('../../prisma/seed.ts');
  const prisma = new PrismaClient({
    datasources: {
      db: { url: TEST_DATABASE_URL },
    },
  });

  try {
    await seedDatabase(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

export async function buildTestApp(): Promise<FastifyInstance> {
  if (fs.existsSync(runtimeDbPath)) {
    fs.copyFileSync(runtimeDbPath, testDbPath);
  }

  await seedTestDatabase();

  const { createApp } = await import('../../src/app/createApp.js');
  return createApp();
}

export const ADMIN_AUTH = { authorization: 'Bearer test-admin-token' };
