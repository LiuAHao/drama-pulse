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

describe('POST /interactions', () => {
  it('should create interaction event and return updated stats', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/interactions',
      payload: {
        deviceId: 'test-device-inter-001',
        episodeId: 'ep_001_01',
        highlightId: 'hl_001_01',
        interactionType: 'emotion_button',
        optionText: '太爽了',
        clientTimestamp: Date.now(),
      },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.code).toBe(0);
    expect(body.data.totalCount).toBe(1);
    expect(body.data.uniqueDeviceCount).toBe(1);
    expect(body.data.heatLevel).toBeGreaterThanOrEqual(0);
  });

  it('should increment stats on multiple interactions', async () => {
    // Second interaction from same device
    const res = await app.inject({
      method: 'POST',
      url: '/interactions',
      payload: {
        deviceId: 'test-device-inter-001',
        episodeId: 'ep_001_01',
        highlightId: 'hl_001_01',
        interactionType: 'emotion_button',
        optionText: '继续',
        clientTimestamp: Date.now(),
      },
    });

    const body = res.json();
    expect(body.data.totalCount).toBe(2);
    // Same device, so unique count stays at 1
    expect(body.data.uniqueDeviceCount).toBe(1);
  });

  it('should track unique devices separately', async () => {
    // Different device
    const res = await app.inject({
      method: 'POST',
      url: '/interactions',
      payload: {
        deviceId: 'test-device-inter-002',
        episodeId: 'ep_001_01',
        highlightId: 'hl_001_01',
        interactionType: 'emotion_button',
        optionText: '太爽了',
        clientTimestamp: Date.now(),
      },
    });

    const body = res.json();
    expect(body.data.totalCount).toBe(3);
    expect(body.data.uniqueDeviceCount).toBe(2);
  });

  it('should return error for non-existent highlight', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/interactions',
      payload: {
        deviceId: 'test-device-inter-003',
        episodeId: 'ep_001_01',
        highlightId: 'nonexistent',
        interactionType: 'emotion_button',
        optionText: 'test',
        clientTimestamp: Date.now(),
      },
    });

    expect(res.statusCode).toBe(404);
  });

  it('should reject mismatched episodeId and highlightId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/interactions',
      payload: {
        deviceId: 'test-device-inter-004',
        episodeId: 'ep_001_02',
        highlightId: 'hl_001_01',
        interactionType: 'emotion_button',
        optionText: 'test',
        clientTimestamp: Date.now(),
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe(40001);
  });
});
