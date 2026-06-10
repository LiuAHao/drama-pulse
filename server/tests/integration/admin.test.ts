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
      select: { title: true, intensity: true, templateId: true, type: true },
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
    expect(body.data.templateId).toBe('boost_action');
    expect(body.data.displayMode).toBe('interactive_component');

    await prisma.highlight.update({
      where: { id: 'hl_001_01' },
      data: original,
    });
  });

  it('should normalize low intensity highlights back to quick prompt template', async () => {
    const original = await prisma.highlight.findUniqueOrThrow({
      where: { id: 'hl_001_02' },
      select: { intensity: true, templateId: true, type: true },
    });
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/highlights/hl_001_02',
      headers: ADMIN_AUTH,
      payload: { intensity: 2, templateId: 'vote_side' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.intensity).toBe(2);
    expect(body.data.templateId).toBe('emotion_button');
    expect(body.data.displayMode).toBe('quick_prompt');
    expect(body.data.soundEnabled).toBe(false);
    expect(body.data.singleUse).toBe(true);

    await prisma.highlight.update({
      where: { id: 'hl_001_02' },
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

describe('Admin player engagement data', () => {
  it('should return interactions without bigint serialization errors', async () => {
    const interactionRes = await app.inject({
      method: 'POST',
      url: '/interactions',
      payload: {
        deviceId: 'admin-interaction-device',
        episodeId: 'ep_001_01',
        highlightId: 'hl_001_01',
        interactionType: 'emotion_button',
        optionText: '爽了',
        clientTimestamp: Date.now(),
      },
    });
    expect(interactionRes.statusCode).toBe(200);

    const res = await app.inject({
      method: 'GET',
      url: '/admin/interactions?page=1&pageSize=20',
      headers: ADMIN_AUTH,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.code).toBe(0);
    expect(Array.isArray(body.data.items)).toBe(true);
    expect(typeof body.data.items[0].clientTimestamp).toBe('string');
  });

  it('should return favorites with content filters', async () => {
    await prisma.favoriteDrama.createMany({
      data: [
        {
          userId: 'user_admin_favorite_a',
          deviceId: 'device_admin_favorite_a',
          dramaId: 'drama_001',
        },
        {
          userId: 'user_admin_favorite_b',
          deviceId: 'device_admin_favorite_b',
          dramaId: 'drama_002',
        },
      ],
    });

    const res = await app.inject({
      method: 'GET',
      url: '/admin/favorites?dramaId=drama_001&page=1&pageSize=10',
      headers: ADMIN_AUTH,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.total).toBeGreaterThan(0);
    expect(body.data.items[0].drama.id).toBe('drama_001');
    expect(body.data.items[0].drama.coverUrl).toContain('/static/assets/');

    await prisma.favoriteDrama.deleteMany({
      where: {
        userId: {
          in: ['user_admin_favorite_a', 'user_admin_favorite_b'],
        },
      },
    });
  });

  it('should return player comments with drama and episode context', async () => {
    await prisma.playerComment.createMany({
      data: [
        {
          userId: 'user_admin_comment_a',
          deviceId: 'device_admin_comment_a',
          episodeId: 'ep_001_01',
          content: '这段评论真上头',
          status: 'visible',
        },
        {
          userId: 'user_admin_comment_b',
          deviceId: 'device_admin_comment_b',
          episodeId: 'ep_002_01',
          content: '另一条评论',
          status: 'visible',
        },
      ],
    });

    const res = await app.inject({
      method: 'GET',
      url: '/admin/player-comments?dramaId=drama_001&page=1&pageSize=10',
      headers: ADMIN_AUTH,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.total).toBeGreaterThan(0);
    expect(body.data.items[0].episode.drama.id).toBe('drama_001');
    expect(body.data.items[0].content).toBeDefined();

    await prisma.playerComment.deleteMany({
      where: {
        userId: {
          in: ['user_admin_comment_a', 'user_admin_comment_b'],
        },
      },
    });
  });

  it('should return danmaku with trigger position and content filters', async () => {
    await prisma.danmakuMessage.createMany({
      data: [
        {
          userId: 'user_admin_danmaku_a',
          deviceId: 'device_admin_danmaku_a',
          episodeId: 'ep_001_02',
          content: '哈哈哈哈',
          triggerPositionMs: 12000,
          status: 'visible',
        },
        {
          userId: 'user_admin_danmaku_b',
          deviceId: 'device_admin_danmaku_b',
          episodeId: 'ep_002_02',
          content: '卧槽',
          triggerPositionMs: 8000,
          status: 'visible',
        },
      ],
    });

    const res = await app.inject({
      method: 'GET',
      url: '/admin/danmaku?episodeId=ep_001_02&page=1&pageSize=10',
      headers: ADMIN_AUTH,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.total).toBeGreaterThan(0);
    expect(body.data.items[0].episode.id).toBe('ep_001_02');
    expect(body.data.items[0].triggerPositionMs).toBe(12000);

    await prisma.danmakuMessage.deleteMany({
      where: {
        userId: {
          in: ['user_admin_danmaku_a', 'user_admin_danmaku_b'],
        },
      },
    });
  });

  it('should return watch progress ordered with drama and episode context', async () => {
    await prisma.watchProgress.createMany({
      data: [
        {
          userId: 'user_admin_progress_a',
          deviceId: 'device_admin_progress_a',
          dramaId: 'drama_001',
          episodeId: 'ep_001_03',
          progressMs: 45678,
        },
        {
          userId: 'user_admin_progress_b',
          deviceId: 'device_admin_progress_b',
          dramaId: 'drama_002',
          episodeId: 'ep_002_01',
          progressMs: 12345,
        },
      ],
    });

    const res = await app.inject({
      method: 'GET',
      url: '/admin/watch-progress?dramaId=drama_001&page=1&pageSize=10',
      headers: ADMIN_AUTH,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.total).toBeGreaterThan(0);
    expect(body.data.items[0].drama.id).toBe('drama_001');
    expect(body.data.items[0].episode.id).toBe('ep_001_03');
    expect(body.data.items[0].progressMs).toBe(45678);

    await prisma.watchProgress.deleteMany({
      where: {
        userId: {
          in: ['user_admin_progress_a', 'user_admin_progress_b'],
        },
      },
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
    expect(body.data.interactionStartMs ?? body.data.startTimeMs).toBeDefined();
    expect(body.data.interactionAppearMs ?? body.data.interactionStartMs ?? body.data.startTimeMs).toBeDefined();
    expect(body.data.interactionEndMs ?? body.data.endTimeMs).toBeDefined();
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
        interactionStartMs: true,
        interactionAppearMs: true,
        interactionEndMs: true,
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
        interactionStartMs: 14000,
        interactionAppearMs: 14600,
        interactionEndMs: 27000,
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
    expect(data.interactionStartMs).toBe(14000);
    expect(data.interactionAppearMs).toBe(14600);
    expect(data.interactionEndMs).toBe(27000);
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
      payload: { type: 'unknown_type' },
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

  it('should reject interactionAppearMs earlier than interactionStartMs', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/highlights/hl_001_01',
      headers: ADMIN_AUTH,
      payload: { interactionStartMs: 15000, interactionAppearMs: 14999, interactionEndMs: 26000 },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /admin/branch-tasks/:taskId', () => {
  it('should return task detail with content and engagement context', async () => {
    const task = await prisma.branchTask.create({
      data: {
        userId: 'user_admin_branch_detail',
        deviceId: 'device_admin_branch_detail',
        episodeId: 'ep_001_01',
        userPrompt: '如果女主这时反击会怎样',
        status: 'success',
        resultTitle: '反击线',
        resultHook: '她终于不忍了',
        resultStory: '女主在众人面前完成了反击。',
        storyboardJson: '[{"scene":"反击开始"}]',
        resultTagsJson: '["反击","爽感"]',
        resultInteractionOptionsJson: '["继续追击","先离开"]',
      },
    });

    await prisma.branchComment.createMany({
      data: [
        {
          branchTaskId: task.id,
          userId: 'user_admin_branch_comment_a',
          deviceId: 'device_admin_branch_comment_a',
          content: '这个分支很带劲',
          status: 'visible',
        },
        {
          branchTaskId: task.id,
          userId: 'user_admin_branch_comment_b',
          deviceId: 'device_admin_branch_comment_b',
          content: '想看后续',
          status: 'visible',
        },
      ],
    });

    await prisma.branchLike.createMany({
      data: [
        {
          branchTaskId: task.id,
          userId: 'user_admin_branch_like_a',
          deviceId: 'device_admin_branch_like_a',
        },
        {
          branchTaskId: task.id,
          userId: 'user_admin_branch_like_b',
          deviceId: 'device_admin_branch_like_b',
        },
      ],
    });

    const res = await app.inject({
      method: 'GET',
      url: `/admin/branch-tasks/${task.id}`,
      headers: ADMIN_AUTH,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.task.id).toBe(task.id);
    expect(body.data.task.count.likes).toBe(2);
    expect(body.data.task.count.comments).toBe(2);
    expect(body.data.task.resultStory).toContain('反击');
    expect(body.data.comments).toHaveLength(2);
    expect(body.data.likes).toHaveLength(2);

    await prisma.branchTask.delete({
      where: { id: task.id },
    });
  });
});

describe('POST /admin/episodes/:episodeId/branch-options/refresh', () => {
  it('should regenerate fixed branch options from story context package and persist sidecar artifacts', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/episodes/ep_002_23/branch-options/refresh',
      headers: {
        ...ADMIN_AUTH,
        host: '192.168.1.88:8787',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.code).toBe(0);
    expect(body.data.options).toHaveLength(2);
    expect(body.data.options[0].title).not.toBe('重新开始');
    expect(body.data.options[0].description.length).toBeGreaterThan(0);
    expect(body.data.options[0].title).not.toBe(body.data.options[1].title);
    expect(body.data.options[0].description).not.toBe(body.data.options[1].description);
    expect(body.data.options[0].generatedPayloadPath).toContain('/static/assets/generated/fixed-branches/ep_002_23/');

    const option = await prisma.branchOption.findUniqueOrThrow({
      where: { id: 'bo_002_01' },
    });
    expect(option.title).toBe(body.data.options[0].title);
    expect(option.description).toBe(body.data.options[0].description);

    const artifactPath = path.resolve(
      process.cwd(),
      '../assets/generated/fixed-branches/ep_002_23/bo_002_01.json',
    );
    const raw = await fs.readFile(artifactPath, 'utf-8');
    const artifact = JSON.parse(raw);
    expect(artifact.resultTitle).toBe(body.data.options[0].title);
    expect(artifact.resultStory).toContain('江青纸');
    expect(artifact.candidateKey).toBeDefined();
    expect(artifact.artifactSignature).toBeDefined();
    expect(artifact.storyboardManifestJson).toBeDefined();
    expect(artifact.referenceAssetsJson).toBeDefined();

    const manifestPath = path.resolve(
      process.cwd(),
      '../assets/generated/fixed-branches/ep_002_23/manifest.json',
    );
    const manifestRaw = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestRaw);
    expect(manifest.episodeId).toBe('ep_002_23');
    expect(manifest.optionIds).toContain('bo_002_01');
    expect(manifest.optionUpdatedAtSnapshots.bo_002_01).toBe(option.updatedAt.toISOString());
    expect(manifest.artifactSignatures.bo_002_01).toBe(artifact.artifactSignature);

    const branchOptionsRes = await app.inject({
      method: 'GET',
      url: '/episodes/ep_002_23/branch-options',
      headers: { host: '192.168.1.88:8787' },
    });
    expect(branchOptionsRes.statusCode).toBe(200);
    const branchOptionsBody = branchOptionsRes.json();
    expect(branchOptionsBody.data[0].generatedPayloadPath).toContain('/static/assets/generated/fixed-branches/ep_002_23/');
    expect(branchOptionsBody.data[0].resultStory).toContain('江青纸');
    expect(branchOptionsBody.data[0].shotPromptJson).toContain('江青纸');
    expect(branchOptionsBody.data[0].storyboardManifestJson).toBeDefined();
  });

  it('should produce clearly distinct fallback branches when llm generation is disabled', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/episodes/ep_001_23/branch-options/refresh',
      headers: {
        ...ADMIN_AUTH,
        host: '192.168.1.88:8787',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.options).toHaveLength(2);
    expect(body.data.options[0].title).not.toBe(body.data.options[1].title);
    expect(body.data.options[0].description).not.toBe(body.data.options[1].description);

    const optionAPath = path.resolve(
      process.cwd(),
      '../assets/generated/fixed-branches/ep_001_23/bo_001_01.json',
    );
    const optionBPath = path.resolve(
      process.cwd(),
      '../assets/generated/fixed-branches/ep_001_23/bo_001_02.json',
    );
    const [rawA, rawB] = await Promise.all([
      fs.readFile(optionAPath, 'utf-8'),
      fs.readFile(optionBPath, 'utf-8'),
    ]);
    const artifactA = JSON.parse(rawA);
    const artifactB = JSON.parse(rawB);

    expect(artifactA.resultTitle).not.toBe(artifactB.resultTitle);
    expect(artifactA.resultHook).not.toBe(artifactB.resultHook);
    expect(artifactA.resultStory).not.toBe(artifactB.resultStory);
    expect(artifactA.storyboardJson).not.toBe(artifactB.storyboardJson);
  });
});

describe('GET /admin/episodes/:episodeId/branch-options', () => {
  it('should return artifact diagnostics and preserve detail payloads even when public validation fails', async () => {
    const refreshRes = await app.inject({
      method: 'POST',
      url: '/admin/episodes/ep_002_23/branch-options/refresh',
      headers: {
        ...ADMIN_AUTH,
        host: '192.168.1.88:8787',
      },
    });
    expect(refreshRes.statusCode).toBe(200);

    const artifactPath = path.resolve(
      process.cwd(),
      '../assets/generated/fixed-branches/ep_002_23/bo_002_01.json',
    );
    const raw = await fs.readFile(artifactPath, 'utf-8');
    const artifact = JSON.parse(raw);

    try {
      artifact.branchOptionUpdatedAtSnapshot = '1999-01-01T00:00:00.000Z';
      await fs.writeFile(artifactPath, JSON.stringify(artifact, null, 2) + '\n', 'utf-8');

      const res = await app.inject({
        method: 'GET',
        url: '/admin/episodes/ep_002_23/branch-options',
        headers: {
          ...ADMIN_AUTH,
          host: '192.168.1.88:8787',
        },
      });
      expect(res.statusCode).toBe(200);

      const body = res.json();
      expect(body.code).toBe(0);
      expect(body.data[0].artifactValid).toBe(false);
      expect(body.data[0].artifactStatus).toBe('snapshot_mismatch');
      expect(body.data[0].artifactValidationMessage).toContain('快照时间不一致');
      expect(body.data[0].generatedPayloadPath).toContain('/static/assets/generated/fixed-branches/ep_002_23/');
      expect(body.data[0].resultStory).toContain('江青纸');
      expect(body.data[0].shotPromptJson).toContain('江青纸');
    } finally {
      await fs.writeFile(artifactPath, raw, 'utf-8');
    }
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

    const favoritesAfter = await prisma.favoriteDrama.count();
    expect(favoritesAfter).toBe(0);

    const playerCommentsAfter = await prisma.playerComment.count();
    expect(playerCommentsAfter).toBe(0);

    const danmakuAfter = await prisma.danmakuMessage.count();
    expect(danmakuAfter).toBe(0);

    const profilesAfter = await prisma.userProfile.count();
    expect(profilesAfter).toBe(0);

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
