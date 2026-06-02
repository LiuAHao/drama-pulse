import type { BranchTask } from '@prisma/client';
import { BRANCH_RESULT_SOURCE } from './constants.js';
import { buildEpisodeContext } from './contextBuilder.js';
import { generateBranchContentFromContext } from './generationPipeline.js';
import { prisma } from '../../shared/db/index.js';
import type { PipelineStage } from './types.js';

async function setStage(taskId: string, stage: PipelineStage): Promise<void> {
  await prisma.branchTask.update({
    where: { id: taskId },
    data: { pipelineStage: stage },
  });
}

export interface ExecutorOptions {}

export function createExecutor(options: ExecutorOptions = {}) {
  return async function execute(task: BranchTask): Promise<void> {
    await prisma.branchTask.update({
      where: { id: task.id },
      data: { status: 'running', startedAt: new Date(), pipelineStage: 'queued' },
    });

    try {
      await setStage(task.id, 'context_prepared');
      const context = await buildEpisodeContext(task.episodeId);

      await setStage(task.id, 'prompt_interpreted');
      const generated = await generateBranchContentFromContext(context, task.userPrompt, {
        mode: 'custom',
        targetCardCount: 6,
      });

      await setStage(task.id, 'story_generated');
      await setStage(task.id, 'assets_prepared');
      await setStage(task.id, 'storyboard_generated');
      await setStage(task.id, 'storyboard_images_generating');
      await setStage(task.id, 'storyboard_images_generated');
      await setStage(task.id, 'manifest_generated');
      const result = generated.projected;

      await prisma.branchTask.update({
        where: { id: task.id },
        data: {
          status: 'success',
          resultTitle: result.resultTitle,
          resultHook: result.resultHook,
          resultStory: result.resultStory,
          storyboardJson: result.storyboardJson,
          resultTagsJson: result.resultTagsJson,
          resultInteractionOptionsJson: result.resultInteractionOptionsJson,
          resultSource: BRANCH_RESULT_SOURCE,
          branchType: result.branchType,
          pipelineStage: result.pipelineStage,
          storyContextJson: result.storyContextJson,
          storyContextVersion: result.storyContextVersion,
          storyContextAssetPath: result.storyContextAssetPath,
          tailStateSnapshotJson: result.tailStateSnapshotJson,
          characterBibleJson: result.characterBibleJson,
          referenceAssetsJson: result.referenceAssetsJson,
          promptPackageJson: result.promptPackageJson,
          storyExpansionJson: result.storyExpansionJson,
          shotPromptJson: result.shotPromptJson,
          storyboardImagesJson: result.storyboardImagesJson,
          storyboardManifestJson: result.storyboardManifestJson,
          narrationPayloadJson: result.narrationPayloadJson,
          imageTaskStatus: result.imageTaskStatus,
          imageTaskPayloadJson: result.imageTaskPayloadJson,
          finishedAt: new Date(),
        },
      });
    } catch (err: any) {
      const isTimeoutError =
        typeof err?.message === 'string' && err.message.includes('timed out');
      await prisma.branchTask.update({
        where: { id: task.id },
        data: {
          status: isTimeoutError ? 'timeout' : 'failed',
          failReason: err?.message || 'Unknown error',
          finishedAt: new Date(),
        },
      });
    }
  };
}

export const execute = createExecutor();
