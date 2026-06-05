import type { ImageClient } from './imageClient.js';
import type { ShotPrompt, StoryboardImageItem } from './types.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(fileURLToPath(new URL('../../../../', import.meta.url)));

export interface ImageGenerationSummary {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: Array<{ scene: number; error: string }>;
}

export interface ImageTaskResult {
  images: StoryboardImageItem[];
  summary: ImageGenerationSummary;
  payloadJson: string;
  status: 'success' | 'partial_failed' | 'failed' | 'skipped';
}

function toSkippedImageItem(shot: ShotPrompt): StoryboardImageItem {
  return {
    shotId: shot.scene,
    sceneTitle: shot.sceneTitle,
    imagePrompt: shot.imagePrompt,
    negativePrompt: shot.negativePrompt,
    imageStatus: 'skipped',
    imageAssetPath: '',
    requiredCharacters: shot.requiredCharacters.map((character) => character.characterName),
    requiredScene: shot.requiredScene,
    referenceTaskImages: shot.referenceTaskImages,
  };
}

export async function generateStoryboardImages(
  shots: ShotPrompt[],
  imageClient?: ImageClient | null,
): Promise<ImageTaskResult> {
  if (!imageClient) {
    const images = shots.map((shot) => toSkippedImageItem(shot));
    return {
      images,
      summary: {
        total: shots.length,
        succeeded: 0,
        failed: 0,
        skipped: shots.length,
        errors: [],
      },
      payloadJson: JSON.stringify({
        requestCount: shots.length,
        mode: 'skipped',
      }),
      status: 'skipped',
    };
  }

  const images: StoryboardImageItem[] = [];
  const errors: Array<{ scene: number; error: string }> = [];

  for (const shot of shots) {
    try {
      const referenceImagePaths = shot.referenceTaskImages.characterRefs
        .filter((item) => item.source === 'local')
        .map((item) => path.resolve(REPO_ROOT, item.assetPath));
      const result = await imageClient.generateImage({
        prompt: shot.imagePrompt,
        referenceImagePaths,
      });
      images.push({
        shotId: shot.scene,
        sceneTitle: shot.sceneTitle,
        imagePrompt: shot.imagePrompt,
        negativePrompt: shot.negativePrompt,
        imageStatus: 'generated',
        imageAssetPath: result.url,
        revisedPrompt: result.revisedPrompt,
        requiredCharacters: shot.requiredCharacters.map((character) => character.characterName),
        requiredScene: shot.requiredScene,
        referenceTaskImages: shot.referenceTaskImages,
      });
    } catch (err: any) {
      errors.push({
        scene: shot.scene,
        error: err?.message || 'Unknown error',
      });
      images.push({
        ...toSkippedImageItem(shot),
        imageStatus: 'failed',
      });
    }
  }

  const generatedCount = images.filter((item) => item.imageStatus === 'generated').length;
  const failedCount = images.filter((item) => item.imageStatus === 'failed').length;
  const skippedCount = images.filter((item) => item.imageStatus === 'skipped').length;

  const status = generatedCount === 0
    ? (failedCount > 0 ? 'failed' : 'skipped')
    : (failedCount > 0 ? 'partial_failed' : 'success');

  return {
    images,
    summary: {
      total: shots.length,
      succeeded: generatedCount,
      failed: failedCount,
      skipped: skippedCount,
      errors,
    },
    payloadJson: JSON.stringify({
      requestCount: shots.length,
      successCount: generatedCount,
      failureCount: failedCount,
      skippedCount,
      errors: errors.length > 0 ? errors : undefined,
    }),
    status,
  };
}
