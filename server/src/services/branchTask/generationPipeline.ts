import { buildEpisodeContext } from './contextBuilder.js';
import { interpretPrompt } from './promptInterpreter.js';
import { projectResult } from './resultProjector.js';
import { generateStory } from './storyGenerator.js';
import { generateStoryboard } from './storyboardGenerator.js';
import { applyReferenceAssetsToStoryboard, collectReferenceAssets } from './assetCollector.js';
import { buildNarrationPayload, buildStoryboardManifest } from './storyboardManifestBuilder.js';
import { createImageClient } from './imageClient.js';
import { generateStoryboardImages } from './storyboardImageGenerator.js';
import { getBranchTaskImageEnv } from './env.js';
import type {
  BranchTaskResult,
  EpisodeContext,
  PromptPackage,
  StoryExpansion,
  StoryboardResult,
  StoryboardImageItem,
  StoryboardManifest,
  NarrationPayload,
} from './types.js';

export interface GeneratedBranchContent {
  context: EpisodeContext;
  promptPackage: PromptPackage;
  storyExpansion: StoryExpansion;
  storyboard: StoryboardResult;
  referenceAssets: Awaited<ReturnType<typeof collectReferenceAssets>>;
  storyboardImages: StoryboardImageItem[];
  storyboardManifest: StoryboardManifest;
  narrationPayload: NarrationPayload;
  imageTaskStatus: string;
  imageTaskPayloadJson: string;
  projected: BranchTaskResult;
}

interface GenerationOptions {
  mode?: 'custom' | 'fixed';
  targetCardCount?: number;
}

function buildImageClientFromEnv() {
  const imageEnv = getBranchTaskImageEnv();
  if (!imageEnv) {
    return null;
  }
  return createImageClient({
    apiKey: imageEnv.apiKey,
    baseUrl: imageEnv.baseUrl,
    model: imageEnv.model,
  });
}

export async function generateBranchContent(
  episodeId: string,
  userPrompt: string,
  options: GenerationOptions = {},
): Promise<GeneratedBranchContent> {
  const context = await buildEpisodeContext(episodeId);
  return generateBranchContentFromContext(context, userPrompt, options);
}

export async function generateBranchContentFromContext(
  context: EpisodeContext,
  userPrompt: string,
  options: GenerationOptions = {},
): Promise<GeneratedBranchContent> {
  const promptPackage = interpretPrompt(userPrompt, context);
  promptPackage.generationMode = options.mode ?? 'custom';
  promptPackage.targetCardCount = options.targetCardCount ?? (promptPackage.generationMode === 'fixed' ? 9 : 6);
  const storyExpansion = await generateStory(promptPackage, context);
  const rawStoryboard = await generateStoryboard(storyExpansion, promptPackage, context);
  const referenceAssets = await collectReferenceAssets(context, storyExpansion, rawStoryboard);
  const storyboard = applyReferenceAssetsToStoryboard(rawStoryboard, referenceAssets);
  const imageClient = buildImageClientFromEnv();
  const imageTaskResult = await generateStoryboardImages(storyboard.shots, imageClient);
  const storyboardManifest = buildStoryboardManifest(
    storyExpansion.title,
    storyExpansion.hook,
    storyboard,
    imageTaskResult.images,
  );
  const narrationPayload = buildNarrationPayload(storyboardManifest);
  const projected = projectResult(
    context,
    promptPackage,
    storyExpansion,
    storyboard,
    referenceAssets,
    imageTaskResult.images,
    storyboardManifest,
    narrationPayload,
    {
      status: imageTaskResult.status,
      payloadJson: imageTaskResult.payloadJson,
    },
    'completed',
  );

  return {
    context,
    promptPackage,
    storyExpansion,
    storyboard,
    referenceAssets,
    storyboardImages: imageTaskResult.images,
    storyboardManifest,
    narrationPayload,
    imageTaskStatus: imageTaskResult.status,
    imageTaskPayloadJson: imageTaskResult.payloadJson,
    projected,
  };
}
