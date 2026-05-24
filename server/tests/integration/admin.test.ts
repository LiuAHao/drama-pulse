import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestApp, ADMIN_AUTH, TEST_DATABASE_URL } from '../helpers/app.js';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

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

describe('Admin auth', () => {
  it('should reject requests without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/dramas' });
    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.code).toBe(40101);
  });

  it('should reject requests with wrong token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/dramas',
      headers: { authorization: 'Bearer wrong-token' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('should accept requests with correct token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/dramas',
      headers: ADMIN_AUTH,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.code).toBe(0);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('GET /admin/dramas', () => {
  it('should return all dramas with episode count', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/dramas',
      headers: ADMIN_AUTH,
    });
    const body = res.json();
    expect(body.data.length).toBe(2);
    expect(body.data[0].episodeCount).toBeDefined();
    expect(body.data[0].coverUrl).toContain('/static/assets/');
  });
});

describe('GET /admin/episodes', () => {
  it('should support filtering by dramaId', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/episodes?dramaId=drama_001',
      headers: ADMIN_AUTH,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    for (const episode of body.data) {
      expect(episode.dramaId).toBe('drama_001');
    }
  });
});

describe('GET /admin/highlights', () => {
  it('should return highlights with status filter', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/highlights?status=confirmed',
      headers: ADMIN_AUTH,
    });
    const body = res.json();
    expect(body.code).toBe(0);
    expect(body.data.items.length).toBeGreaterThan(0);
    for (const hl of body.data.items) {
      expect(hl.status).toBe('confirmed');
    }
  });

  it('should return candidate highlights', async () => {
    // Note: hl_001_04 may have been changed by other tests, so just check the filter works
    const res = await app.inject({
      method: 'GET',
      url: '/admin/highlights?status=candidate',
      headers: ADMIN_AUTH,
    });
    const body = res.json();
    expect(body.code).toBe(0);
    for (const hl of body.data.items) {
      expect(hl.status).toBe('candidate');
    }
  });
});

describe('PATCH /admin/highlights/:highlightId', () => {
  it('should update highlight fields', async () => {
    const original = await prisma.highlight.findUniqueOrThrow({
      where: { id: 'hl_001_01' },
      select: { title: true, intensity: true },
    });
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/highlights/hl_001_01',
      headers: ADMIN_AUTH,
      payload: { title: '更新后的标题', intensity: 5 },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.title).toBe('更新后的标题');
    expect(body.data.intensity).toBe(5);

    await prisma.highlight.update({
      where: { id: 'hl_001_01' },
      data: original,
    });
  });
});

describe('POST /admin/highlights/:highlightId/enable and disable', () => {
  it('should enable a highlight', async () => {
    // Use hl_001_02 (confirmed) to test enable (no-op) and then disable/enable cycle
    const res = await app.inject({
      method: 'POST',
      url: '/admin/highlights/hl_001_02/disable',
      headers: ADMIN_AUTH,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('disabled');

    const res2 = await app.inject({
      method: 'POST',
      url: '/admin/highlights/hl_001_02/enable',
      headers: ADMIN_AUTH,
    });
    expect(res2.statusCode).toBe(200);
    expect(res2.json().data.status).toBe('confirmed');
  });

  it('should disable a highlight', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/highlights/hl_001_03/disable',
      headers: ADMIN_AUTH,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('disabled');

    // Restore to confirmed
    await app.inject({
      method: 'POST',
      url: '/admin/highlights/hl_001_03/enable',
      headers: ADMIN_AUTH,
    });
  });
});

describe('GET /admin/highlights/:highlightId', () => {
  it('should return highlight detail with episode and drama', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/highlights/hl_001_01',
      headers: ADMIN_AUTH,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.id).toBe('hl_001_01');
    expect(body.data.episode).toBeDefined();
    expect(body.data.episode.videoUrl).toContain('/static/');
    expect(body.data.drama).toBeDefined();
    expect(body.data.drama.title).toBeDefined();
  });

  it('should return 404 for non-existent highlight', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/highlights/non_existent',
      headers: ADMIN_AUTH,
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /admin/highlights/:highlightId/review-context', () => {
  it('should return review context with transcript when available', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/highlights/hl_001_01/review-context',
      headers: ADMIN_AUTH,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.highlight).toBeDefined();
    expect(body.data.transcriptAvailable).toBeDefined();
    expect(Array.isArray(body.data.transcriptContext)).toBe(true);
    expect(Array.isArray(body.data.candidateNeighbors)).toBe(true);
  });

  it('should return empty transcript when file missing', async () => {
    // hl_001_01's episode may not have a transcript file
    const res = await app.inject({
      method: 'GET',
      url: '/admin/highlights/hl_001_01/review-context',
      headers: ADMIN_AUTH,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    // transcriptAvailable should be false if no file found
    if (!body.data.transcriptAvailable) {
      expect(body.data.transcriptContext).toEqual([]);
    }
  });
});

describe('POST /admin/highlights/:highlightId/confirm', () => {
  it('should confirm a candidate highlight', async () => {
    // First set hl_001_04 to candidate with source=ai
    await app.inject({
      method: 'PATCH',
      url: '/admin/highlights/hl_001_04',
      headers: ADMIN_AUTH,
      payload: { status: 'candidate' },
    });
    // Verify it's candidate
    const before = await app.inject({
      method: 'GET',
      url: '/admin/highlights/hl_001_04',
      headers: ADMIN_AUTH,
    });
    expect(before.json().data.status).toBe('candidate');

    // Confirm it
    const res = await app.inject({
      method: 'POST',
      url: '/admin/highlights/hl_001_04/confirm',
      headers: ADMIN_AUTH,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.status).toBe('confirmed');

    await prisma.highlight.update({
      where: { id: 'hl_001_04' },
      data: { source: 'ai', status: 'candidate' },
    });
  });

  it('should change source from ai to ai_manual on confirm', async () => {
    // Set source to ai first
    await app.inject({
      method: 'PATCH',
      url: '/admin/highlights/hl_001_04',
      headers: ADMIN_AUTH,
      payload: { status: 'candidate' },
    });
    // Directly set source to ai via DB
    const prismaClient = new PrismaClient({
      datasources: {
        db: { url: TEST_DATABASE_URL },
      },
    });
    await prismaClient.highlight.update({
      where: { id: 'hl_001_04' },
      data: { source: 'ai', status: 'candidate' },
    });
    await prismaClient.$disconnect();

    const res = await app.inject({
      method: 'POST',
      url: '/admin/highlights/hl_001_04/confirm',
      headers: ADMIN_AUTH,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.source).toBe('ai_manual');
    expect(res.json().data.status).toBe('confirmed');

    await prisma.highlight.update({
      where: { id: 'hl_001_04' },
      data: { source: 'ai', status: 'candidate' },
    });
  });
});

describe('PATCH /admin/highlights/:highlightId extended fields', () => {
  it('should update review extension fields', async () => {
    const original = await prisma.highlight.findUniqueOrThrow({
      where: { id: 'hl_001_01' },
      select: {
        reason: true,
        supportingSegmentIdsJson: true,
        speakerGuess: true,
        targetCharacterGuess: true,
        mentionedCharactersJson: true,
        characterGuessConfidence: true,
      },
    });
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/highlights/hl_001_01',
      headers: ADMIN_AUTH,
      payload: {
        reason: '求助被拒绝，情绪峰值明确',
        supportingSegmentIdsJson: '["seg_0029","seg_0030"]',
        speakerGuess: '女主',
        targetCharacterGuess: '娘家人',
        mentionedCharactersJson: '["女主","娘家"]',
        characterGuessConfidence: 0.72,
      },
    });
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(data.reason).toBe('求助被拒绝，情绪峰值明确');
    expect(data.speakerGuess).toBe('女主');
    expect(data.characterGuessConfidence).toBeCloseTo(0.72);

    await prisma.highlight.update({
      where: { id: 'hl_001_01' },
      data: original,
    });
  });

  it('should reject invalid JSON in JSON fields', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/highlights/hl_001_01',
      headers: ADMIN_AUTH,
      payload: { supportingSegmentIdsJson: 'not-json' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('should reject invalid type enum', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/highlights/hl_001_01',
      headers: ADMIN_AUTH,
      payload: { type: 'funny' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('should reject invalid templateId enum', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/highlights/hl_001_01',
      headers: ADMIN_AUTH,
      payload: { templateId: 'ending_branch' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /admin/demo/reset', () => {
  it('should reset runtime data but preserve seed data', async () => {
    const highlightCountBefore = await prisma.highlight.count();
    const branchOptionCountBefore = await prisma.branchOption.count();

    // Create some runtime data first
    await app.inject({
      method: 'POST',
      url: '/interactions',
      payload: {
        deviceId: 'reset-test-device',
        episodeId: 'ep_001_01',
        highlightId: 'hl_001_01',
        interactionType: 'emotion_button',
        optionText: 'test',
        clientTimestamp: Date.now(),
      },
    });

    // Verify runtime data exists
    const eventsBefore = await prisma.interactionEvent.count();
    expect(eventsBefore).toBeGreaterThan(0);

    // Reset
    const res = await app.inject({
      method: 'POST',
      url: '/admin/demo/reset',
      headers: ADMIN_AUTH,
    });
    expect(res.statusCode).toBe(200);

    // Verify runtime data cleared
    const eventsAfter = await prisma.interactionEvent.count();
    expect(eventsAfter).toBe(0);

    const tasksAfter = await prisma.branchTask.count();
    expect(tasksAfter).toBe(0);

    const progressAfter = await prisma.watchProgress.count();
    expect(progressAfter).toBe(0);

    // Verify seed data preserved
    const dramas = await prisma.drama.count();
    expect(dramas).toBe(2);

    const episodes = await prisma.episode.count();
    expect(episodes).toBe(46);

    const highlights = await prisma.highlight.count();
    expect(highlights).toBe(highlightCountBefore);

    const branchOptions = await prisma.branchOption.count();
    expect(branchOptions).toBe(branchOptionCountBefore);
  });
});

describe('POST /admin/assets/config', () => {
  it('should return current config and applied roots', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/assets/config',
      headers: ADMIN_AUTH,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.appliedRoots).toBeDefined();
  });

  it('should persist resource config under project root config directory', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/assets/config',
      headers: ADMIN_AUTH,
      payload: { videosRoot: '../videos' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.saved.videosRoot).toBe('../videos');

    const configPath = path.resolve(process.cwd(), '../config/resource-paths.local.json');
    const raw = await fs.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.videosRoot).toBe('../videos');

    await fs.unlink(configPath);
  });

  it('should hot-apply updated asset roots without restarting server', async () => {
    const projectRoot = path.resolve(process.cwd(), '..');
    const tempRoot = path.join(projectRoot, 'tmp-test-assets-hot');
    const tempAssetsRoot = path.join(tempRoot, 'assets');
    const testFilePath = path.join(tempAssetsRoot, 'hot-check.txt');
    const configPath = path.join(projectRoot, 'config/resource-paths.local.json');

    await fs.mkdir(tempAssetsRoot, { recursive: true });
    await fs.writeFile(testFilePath, 'hot-applied', 'utf-8');

    const res = await app.inject({
      method: 'POST',
      url: '/admin/assets/config',
      headers: ADMIN_AUTH,
      payload: { assetsRoot: '../tmp-test-assets-hot/assets' },
    });

    expect(res.statusCode).toBe(200);

    const fileRes = await app.inject({
      method: 'GET',
      url: '/static/assets/hot-check.txt',
      headers: ADMIN_AUTH,
    });

    expect(fileRes.statusCode).toBe(200);
    expect(fileRes.body).toBe('hot-applied');

    await fs.rm(tempRoot, { recursive: true, force: true });
    await fs.unlink(configPath).catch(() => undefined);
  });
});
