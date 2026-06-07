import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { TEST_DATABASE_URL } from '../helpers/app.js';
import { seedDatabase } from '../../prisma/seed.js';
import {
  processTask,
  setTaskProcessor,
  setTaskProcessorTimeoutMs,
  setTaskProcessorGenerator,
  resetTaskProcessorConfig,
} from '../../src/services/taskQueue/index.js';
import { createExecutor } from '../../src/services/branchTask/branchTaskExecutor.js';

const prisma = new PrismaClient({
  datasources: {
    db: { url: TEST_DATABASE_URL },
  },
});

beforeAll(async () => {
  await seedDatabase(prisma);
});

describe('taskQueue timeout handling', () => {
  beforeEach(() => {
    resetTaskProcessorConfig();
    process.env.BRANCH_TASK_DISABLE_LLM = '1';
  });

  afterEach(async () => {
    resetTaskProcessorConfig();
    delete process.env.BRANCH_TASK_DISABLE_LLM;
    await prisma.branchTask.deleteMany({
      where: { userPrompt: 'timeout-test-prompt' },
    });
  });

  it('marks branch task as timeout when generator exceeds timeout limit', async () => {
    setTaskProcessorTimeoutMs(50);
    setTaskProcessorGenerator(async () => {
      await new Promise((resolve) => setTimeout(resolve, 120));
      return {
        resultTitle: 'late result',
        resultHook: 'late hook',
        resultStory: 'late story',
        storyboardJson: '[]',
        resultTagsJson: '[]',
        resultInteractionOptionsJson: '[]',
      };
    });

    const task = await prisma.branchTask.create({
      data: {
        userId: 'user_timeout_test',
        deviceId: 'device-timeout-test',
        episodeId: 'ep_001_23',
        userPrompt: 'timeout-test-prompt',
        status: 'pending',
      },
    });

    await processTask(task);

    const updated = await prisma.branchTask.findUniqueOrThrow({
      where: { id: task.id },
    });

    expect(updated.status).toBe('timeout');
    expect(updated.failReason).toContain('timed out');
  });

  it('marks successful branch task results with doubao source', async () => {
    setTaskProcessorGenerator(async () => ({
      resultTitle: 'generated result',
      resultHook: 'hook',
      resultStory: 'story',
      storyboardJson: '[]',
      resultTagsJson: '[]',
      resultInteractionOptionsJson: '[]',
    }));

    const task = await prisma.branchTask.create({
      data: {
        userId: 'user_success_test',
        deviceId: 'device-success-test',
        episodeId: 'ep_001_23',
        userPrompt: 'timeout-test-prompt',
        status: 'pending',
      },
    });

    await processTask(task);

    const updated = await prisma.branchTask.findUniqueOrThrow({
      where: { id: task.id },
    });

    expect(updated.status).toBe('success');
    expect(updated.resultSource).toBe('doubao');
  });
});

describe('taskQueue staged executor pipeline', () => {
  beforeEach(() => {
    process.env.BRANCH_TASK_DISABLE_LLM = '1';
  });

  afterEach(async () => {
    resetTaskProcessorConfig();
    delete process.env.BRANCH_TASK_DISABLE_LLM;
    await prisma.branchTask.deleteMany({
      where: { userPrompt: { contains: 'pipeline-test' } },
    });
  });

  it('runs staged executor and populates all pipeline fields on success', async () => {
    const task = await prisma.branchTask.create({
      data: {
        userId: 'user_pipeline_test',
        deviceId: 'device-pipeline-test',
        episodeId: 'ep_002_23',
        userPrompt: 'pipeline-test: 给一个误会解开后的反转结局',
        status: 'pending',
      },
    });

    await processTask(task);

    const updated = await prisma.branchTask.findUniqueOrThrow({
      where: { id: task.id },
    });

    expect(updated.status).toBe('success');
    expect(updated.resultSource).toBe('doubao');
    expect(updated.branchType).toBe('reversal');
    expect(updated.pipelineStage).toBe('completed');
    expect(updated.resultTitle).toBeTruthy();
    expect(updated.resultHook).toBeTruthy();
    expect(updated.resultStory).toBeTruthy();
    expect(updated.resultStory).toContain('江青纸');
    expect(updated.resultStory).not.toContain('用户提出的');

    const promptPackage = JSON.parse(updated.promptPackageJson);
    expect(promptPackage.originalPrompt).toContain('误会解开后的反转结局');
    expect(promptPackage.branchType).toBe('reversal');
    expect(promptPackage.storyContextVersion).toBeTruthy();
    expect(Array.isArray(promptPackage.canonConstraints)).toBe(true);
    expect(promptPackage.canonConstraints.length).toBeGreaterThan(0);

    const storyExpansion = JSON.parse(updated.storyExpansionJson);
    expect(storyExpansion.title).toBeTruthy();
    expect(storyExpansion.story).toBeTruthy();
    expect(storyExpansion.summary.opening).toBeTruthy();
    expect(Array.isArray(storyExpansion.storyBeats)).toBe(true);
    expect(storyExpansion.storyBeats.length).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(storyExpansion.characterFocus)).toBe(true);
    expect(storyExpansion.characterFocus.length).toBeGreaterThan(0);
    expect(storyExpansion.characterFocus).toContain('江青纸');
    expect(Array.isArray(storyExpansion.cast)).toBe(true);

    const shotPromptPackage = JSON.parse(updated.shotPromptJson);
    expect(shotPromptPackage.contractVersion).toBe('branch-image-story-v1');
    expect(shotPromptPackage.readingMode).toBe('vertical_comic');
    expect(Array.isArray(shotPromptPackage.globalCharacterConsistencyNotes)).toBe(true);
    expect(Array.isArray(shotPromptPackage.shots)).toBe(true);
    expect(shotPromptPackage.shots.length).toBeGreaterThanOrEqual(3);
    expect(shotPromptPackage.shots[0].imagePrompt).toBeTruthy();
    expect(Array.isArray(shotPromptPackage.shots[0].requiredCharacters)).toBe(true);
    expect(shotPromptPackage.shots[0].requiredCharacters.length).toBeGreaterThan(0);
    expect(shotPromptPackage.shots[0].emotion).toBeTruthy();
    expect(shotPromptPackage.shots[0].requiredScene).toBe('');
    expect(shotPromptPackage.shots[0].compositionNotes).toBeTruthy();
    expect(shotPromptPackage.shots[0].dialogueText).toBeTruthy();
    expect(shotPromptPackage.shots[0].assetCarryNotes).toBeTruthy();
    expect(shotPromptPackage.shots[0].negativePrompt).toBeTruthy();
    expect(shotPromptPackage.shots[0].referenceTaskImages).toBeTruthy();
    expect(shotPromptPackage.shots[0].imagePrompt).not.toContain('用户提出的');

    const manifest = JSON.parse(updated.storyboardManifestJson);
    expect(manifest.readingMode).toBe('vertical_comic');
    expect(Array.isArray(manifest.cards)).toBe(true);
    expect(manifest.cards.length).toBeGreaterThanOrEqual(3);
    expect(manifest.cards[0].narrationText).toBeTruthy();

    const storyboardImages = JSON.parse(updated.storyboardImagesJson);
    expect(Array.isArray(storyboardImages)).toBe(true);
    expect(storyboardImages[0].imagePrompt).toBeTruthy();
    expect(storyboardImages[0].requiredCharacters.length).toBeGreaterThan(0);

    const referenceAssets = JSON.parse(updated.referenceAssetsJson);
    expect(Array.isArray(referenceAssets.characterRefs)).toBe(true);

    const narrationPayload = JSON.parse(updated.narrationPayloadJson);
    expect(narrationPayload.narrationText).toBeTruthy();

    expect(updated.imageTaskStatus).toBe('skipped');

    const storyboard = JSON.parse(updated.storyboardJson);
    expect(storyboard.length).toBeGreaterThan(0);
    expect(storyboard[0].narrationText).toBeTruthy();
  });

  it('classifies branch type from prompt keywords', async () => {
    const task = await prisma.branchTask.create({
      data: {
        userId: 'user_type_test',
        deviceId: 'device-type-test',
        episodeId: 'ep_001_23',
        userPrompt: 'pipeline-test: 给一个甜蜜的爱情结局',
        status: 'pending',
      },
    });

    await processTask(task);

    const updated = await prisma.branchTask.findUniqueOrThrow({
      where: { id: task.id },
    });

    expect(updated.status).toBe('success');
    expect(updated.branchType).toBe('romance');
  });

  it('handles custom processor override', async () => {
    setTaskProcessor(async (task) => {
      await prisma.branchTask.update({
        where: { id: task.id },
        data: {
          status: 'success',
          resultTitle: 'custom processor result',
          pipelineStage: 'completed',
          finishedAt: new Date(),
        },
      });
    });

    const task = await prisma.branchTask.create({
      data: {
        userId: 'user_custom_proc',
        deviceId: 'device-custom-proc',
        episodeId: 'ep_001_23',
        userPrompt: 'pipeline-test: custom processor',
        status: 'pending',
      },
    });

    await processTask(task);

    const updated = await prisma.branchTask.findUniqueOrThrow({
      where: { id: task.id },
    });

    expect(updated.status).toBe('success');
    expect(updated.resultTitle).toBe('custom processor result');
  });

  it('persists failed stage when executor throws', async () => {
    setTaskProcessor(async (task) => {
      await prisma.branchTask.update({
        where: { id: task.id },
        data: { status: 'running', startedAt: new Date(), pipelineStage: 'context_prepared' },
      });
      try {
        throw new Error('context build failed');
      } catch (err: any) {
        await prisma.branchTask.update({
          where: { id: task.id },
          data: {
            status: 'failed',
            failReason: err?.message || 'Unknown error',
            finishedAt: new Date(),
          },
        });
      }
    });

    const task = await prisma.branchTask.create({
      data: {
        userId: 'user_fail_test',
        deviceId: 'device-fail-test',
        episodeId: 'ep_001_23',
        userPrompt: 'pipeline-test: fail scenario',
        status: 'pending',
      },
    });

    await processTask(task);

    const updated = await prisma.branchTask.findUniqueOrThrow({
      where: { id: task.id },
    });

    expect(updated.status).toBe('failed');
    expect(updated.failReason).toContain('context build failed');
  });
});
