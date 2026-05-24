import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestApp, TEST_DATABASE_URL } from '../helpers/app.js';
import { PrismaClient } from '@prisma/client';

let app: FastifyInstance;
const prisma = new PrismaClient({
  datasources: {
    db: { url: TEST_DATABASE_URL },
  },
});

beforeAll(async () => {
  await prisma.highlight.update({
    where: { id: 'hl_001_04' },
    data: { source: 'ai', status: 'candidate' },
  });
  app = await buildTestApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('GET /episodes/:episodeId/highlights', () => {
  it('should return only confirmed highlights', async () => {
    const res = await app.inject({ method: 'GET', url: '/episodes/ep_001_01/highlights' });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.code).toBe(0);
    expect(Array.isArray(body.data)).toBe(true);

    // Should return 3 confirmed highlights (not the candidate one)
    expect(body.data.length).toBe(3);

    for (const hl of body.data) {
      expect(hl.status).toBe('confirmed');
      expect(hl.stats).toBeDefined();
      expect(hl.stats.totalCount).toBeDefined();
    }
  });

  it('should return highlights sorted by startTimeMs', async () => {
    const res = await app.inject({ method: 'GET', url: '/episodes/ep_001_01/highlights' });
    const body = res.json();

    for (let i = 1; i < body.data.length; i++) {
      expect(body.data[i].startTimeMs).toBeGreaterThan(body.data[i - 1].startTimeMs);
    }
  });

  it('should return empty array for episode with no confirmed highlights', async () => {
    // ep_001_03 has no highlights in seed data
    const res = await app.inject({ method: 'GET', url: '/episodes/ep_001_03/highlights' });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.data.length).toBe(0);
  });
});

describe('GET /highlights/:highlightId/stats', () => {
  it('should return stats for a highlight', async () => {
    // Use hl_001_02 which is less likely to have interactions from other tests
    const res = await app.inject({ method: 'GET', url: '/highlights/hl_001_02/stats' });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.code).toBe(0);
    expect(body.data).toBeDefined();
    expect(typeof body.data.totalCount).toBe('number');
    expect(typeof body.data.uniqueDeviceCount).toBe('number');
    expect(typeof body.data.heatLevel).toBe('number');
  });

  it('should return 404 for non-existent highlight', async () => {
    const res = await app.inject({ method: 'GET', url: '/highlights/nonexistent/stats' });
    expect(res.statusCode).toBe(404);
  });
});
