import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestApp, ADMIN_AUTH, TEST_DATABASE_URL } from '../helpers/app.js';
import { PrismaClient } from '@prisma/client';
import { getUserIdFromDeviceId } from '../../src/services/userIdentity/index.js';

const prisma = new PrismaClient({
  datasources: {
    db: { url: TEST_DATABASE_URL },
  },
});
let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('GET /dramas', () => {
  it('should return featured and alternative dramas', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/dramas',
      headers: { host: '192.168.1.88:8787' },
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.code).toBe(0);
    expect(body.data.featured).toBeDefined();
    expect(body.data.alternatives).toBeDefined();
    expect(Array.isArray(body.data.featured)).toBe(true);
    expect(Array.isArray(body.data.alternatives)).toBe(true);
    expect(body.data.featured.length).toBeGreaterThan(0);
    expect(body.data.featured[0].coverPath).toContain('http://192.168.1.88:8787/');
  });

  it('should return continueWatching when x-device-id header is present', async () => {
    // First create a watch progress
    const deviceId = 'test-device-content-001';
    const userId = getUserIdFromDeviceId(deviceId);
    const episodes = await prisma.episode.findMany({ where: { dramaId: 'drama_001' }, take: 1 });
    expect(episodes.length).toBeGreaterThan(0);

    const res = await app.inject({
      method: 'POST',
      url: `/users/${userId}/watch-progress`,
      payload: { deviceId, episodeId: episodes[0].id, progressMs: 5000 },
    });
    expect(res.statusCode).toBe(200);

    const dramasRes = await app.inject({
      method: 'GET',
      url: '/dramas',
      headers: { 'x-device-id': deviceId },
    });
    expect(dramasRes.statusCode).toBe(200);

    const body = dramasRes.json();
    expect(body.data.continueWatching).not.toBeNull();
    expect(body.data.continueWatching.progressMs).toBe(5000);
    expect(body.data.continueWatching.drama.coverPath).toContain('http://');
    expect(body.data.continueWatching.episode.videoPath).toContain('http://');
    expect(body.data.continueWatching.episode.videoUrl).toContain('http://');
  });
});

describe('GET /dramas/:dramaId/episodes', () => {
  it('should return episodes sorted by episode_no', async () => {
    const res = await app.inject({ method: 'GET', url: '/dramas/drama_001/episodes' });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.code).toBe(0);
    expect(body.data.length).toBe(23);

    // Verify sorted by episodeNo
    for (let i = 1; i < body.data.length; i++) {
      expect(body.data[i].episodeNo).toBeGreaterThan(body.data[i - 1].episodeNo);
    }
  });
});

describe('GET /episodes/:episodeId', () => {
  it('should return episode detail', async () => {
    const res = await app.inject({ method: 'GET', url: '/episodes/ep_001_01' });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.code).toBe(0);
    expect(body.data.id).toBe('ep_001_01');
    expect(body.data.dramaId).toBe('drama_001');
  });

  it('should return 404 for non-existent episode', async () => {
    const res = await app.inject({ method: 'GET', url: '/episodes/nonexistent' });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /users/:userId/watch-progress', () => {
  it('should return nested drama and episode with URL-mapped resource fields', async () => {
    const deviceId = 'test-device-progress-001';
    const userId = getUserIdFromDeviceId(deviceId);

    const saveRes = await app.inject({
      method: 'POST',
      url: `/users/${userId}/watch-progress`,
      headers: { host: '192.168.1.88:8787', 'x-device-id': deviceId },
      payload: { deviceId, episodeId: 'ep_001_01', progressMs: 12345 },
    });
    expect(saveRes.statusCode).toBe(200);

    const res = await app.inject({
      method: 'GET',
      url: `/users/${userId}/watch-progress`,
      headers: { host: '192.168.1.88:8787', 'x-device-id': deviceId },
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.code).toBe(0);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].drama.coverPath).toContain('http://192.168.1.88:8787/');
    expect(body.data[0].episode.videoPath).toContain('http://192.168.1.88:8787/');
    expect(body.data[0].episode.videoUrl).toContain('http://192.168.1.88:8787/');
  });
});
