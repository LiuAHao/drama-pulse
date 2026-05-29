import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestApp, TEST_DATABASE_URL } from '../helpers/app.js';
import { PrismaClient } from '@prisma/client';

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

describe('GET /episodes/:episodeId/branch-options', () => {
  it('should return branch options for final episode', async () => {
    const res = await app.inject({ method: 'GET', url: '/episodes/ep_001_23/branch-options' });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.code).toBe(0);
    expect(body.data.length).toBe(2);
    expect(body.data[0].title).toBeDefined();
  });

  it('should return empty array for non-final episode', async () => {
    const res = await app.inject({ method: 'GET', url: '/episodes/ep_001_01/branch-options' });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.data.length).toBe(0);
  });
});

describe('POST /branch-tasks', () => {
  it('should reject branch task on non-final episode', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/branch-tasks',
      payload: {
        deviceId: 'test-device-branch-001',
        episodeId: 'ep_001_01',
        userPrompt: '我想看主角穿越回现代',
      },
    });

    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.code).toBe(40009);
  });

  it('should create branch task on final episode', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/branch-tasks',
      payload: {
        deviceId: 'test-device-branch-002',
        episodeId: 'ep_001_23',
        userPrompt: '我想看主角回到现实世界',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.code).toBe(0);
    expect(body.data.status).toBe('pending');
    expect(body.data.episodeId).toBe('ep_001_23');
    expect(body.data.count.likes).toBe(0);
    expect(body.data.count.comments).toBe(0);
  });
});

describe('GET /branch-tasks/:taskId', () => {
  it('should return client-shaped task detail with count and URL-mapped nested fields', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/branch-tasks',
      headers: { host: '192.168.1.88:8787' },
      payload: {
        deviceId: 'test-device-branch-detail-001',
        episodeId: 'ep_001_23',
        userPrompt: '测试分支详情',
      },
    });
    const taskId = createRes.json().data.id;

    const likeRes = await app.inject({
      method: 'POST',
      url: `/branch-tasks/${taskId}/likes`,
      payload: { deviceId: 'test-device-branch-detail-001' },
    });
    expect(likeRes.statusCode).toBe(200);

    const commentRes = await app.inject({
      method: 'POST',
      url: `/branch-tasks/${taskId}/comments`,
      payload: { deviceId: 'test-device-branch-detail-001', content: '好看' },
    });
    expect(commentRes.statusCode).toBe(200);

    const res = await app.inject({
      method: 'GET',
      url: `/branch-tasks/${taskId}`,
      headers: { host: '192.168.1.88:8787' },
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.code).toBe(0);
    expect(body.data.count.likes).toBe(1);
    expect(body.data.count.comments).toBe(1);
    expect(body.data.episode.videoPath).toContain('http://192.168.1.88:8787/');
    expect(body.data.episode.videoUrl).toContain('http://192.168.1.88:8787/');
    expect(body.data.drama.coverPath).toContain('http://192.168.1.88:8787/');
  });
});

describe('GET /users/:userId/branch-tasks', () => {
  it('should return list with client-shaped count and URL-mapped nested fields', async () => {
    const deviceId = 'test-device-branch-list-001';
    const createRes = await app.inject({
      method: 'POST',
      url: '/branch-tasks',
      headers: { host: '192.168.1.88:8787' },
      payload: {
        deviceId,
        episodeId: 'ep_001_23',
        userPrompt: '测试分支列表',
      },
    });
    expect(createRes.statusCode).toBe(200);
    const userId = createRes.json().data.userId;
    const taskId = createRes.json().data.id;

    await app.inject({
      method: 'POST',
      url: `/branch-tasks/${taskId}/likes`,
      payload: { deviceId },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/users/${userId}/branch-tasks`,
      headers: { host: '192.168.1.88:8787', 'x-device-id': deviceId },
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.code).toBe(0);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].count.likes).toBeGreaterThanOrEqual(1);
    expect(body.data[0].count.comments).toBeGreaterThanOrEqual(0);
    expect(body.data[0].episode.videoPath).toContain('http://192.168.1.88:8787/');
    expect(body.data[0].episode.videoUrl).toContain('http://192.168.1.88:8787/');
    expect(body.data[0].drama.coverPath).toContain('http://192.168.1.88:8787/');
  });

  it('should require x-device-id for branch task list fetch', async () => {
    const deviceId = 'test-device-branch-list-002';
    const createRes = await app.inject({
      method: 'POST',
      url: '/branch-tasks',
      payload: {
        deviceId,
        episodeId: 'ep_001_23',
        userPrompt: '测试分支列表鉴权',
      },
    });
    const userId = createRes.json().data.userId;

    const res = await app.inject({
      method: 'GET',
      url: `/users/${userId}/branch-tasks`,
    });

    expect(res.statusCode).toBe(400);
  });
});

describe('POST /branch-tasks/:taskId/likes', () => {
  it('should be idempotent for same user', async () => {
    // Create a task first
    const createRes = await app.inject({
      method: 'POST',
      url: '/branch-tasks',
      payload: {
        deviceId: 'test-device-like-001',
        episodeId: 'ep_001_23',
        userPrompt: '测试点赞',
      },
    });
    const taskId = createRes.json().data.id;

    // First like
    const res1 = await app.inject({
      method: 'POST',
      url: `/branch-tasks/${taskId}/likes`,
      payload: { deviceId: 'test-device-like-001' },
    });
    expect(res1.statusCode).toBe(200);
    expect(res1.json().data.likeCount).toBe(1);

    // Second like from same device (should be idempotent)
    const res2 = await app.inject({
      method: 'POST',
      url: `/branch-tasks/${taskId}/likes`,
      payload: { deviceId: 'test-device-like-001' },
    });
    expect(res2.statusCode).toBe(200);
    expect(res2.json().data.likeCount).toBe(1);

    // Like from different device
    const res3 = await app.inject({
      method: 'POST',
      url: `/branch-tasks/${taskId}/likes`,
      payload: { deviceId: 'test-device-like-002' },
    });
    expect(res3.statusCode).toBe(200);
    expect(res3.json().data.likeCount).toBe(2);
  });
});
