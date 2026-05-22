import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  processTask,
  setTaskProcessorTimeoutMs,
  setTaskProcessorGenerator,
  resetTaskProcessorConfig,
} from '../../src/services/taskQueue/index.js';

const prisma = new PrismaClient();

describe('taskQueue timeout handling', () => {
  beforeEach(() => {
    resetTaskProcessorConfig();
  });

  afterEach(async () => {
    resetTaskProcessorConfig();
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
});
