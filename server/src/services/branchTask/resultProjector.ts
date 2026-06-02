import type {
  BranchTaskResult,
  EpisodeContext,
  PipelineStage,
  PromptPackage,
  ReferenceAssetItem,
  StoryboardImageItem,
  StoryboardManifest,
  StoryExpansion,
  StoryboardResult,
  NarrationPayload,
} from './types.js';

export function projectResult(
  context: EpisodeContext,
  promptPackage: PromptPackage,
  storyExpansion: StoryExpansion,
  storyboard: StoryboardResult,
  referenceAssets: {
    characterRefs: ReferenceAssetItem[];
    sceneRefs: ReferenceAssetItem[];
    styleRefs: ReferenceAssetItem[];
    carryNotes: string;
  },
  storyboardImages: StoryboardImageItem[],
  storyboardManifest: StoryboardManifest,
  narrationPayload: NarrationPayload,
  imageTask: {
    status: string;
    payloadJson: string;
  },
  pipelineStage: PipelineStage,
): BranchTaskResult {
  return {
    resultTitle: storyExpansion.title,
    resultHook: storyExpansion.hook,
    resultStory: storyExpansion.story,
    storyboardJson: JSON.stringify(
      storyboard.shots.map((s) => ({
        scene: s.scene,
        sceneTitle: s.sceneTitle,
        description: s.description,
        narrationText: s.narrationText,
        dialogueText: s.dialogueText,
      })),
    ),
    resultTagsJson: JSON.stringify(storyExpansion.tags),
    resultInteractionOptionsJson: JSON.stringify([
      { text: '喜欢这个结局', action: 'like' },
      { text: '分享给朋友', action: 'share' },
    ]),
    branchType: promptPackage.branchType,
    pipelineStage,
    storyContextJson: JSON.stringify(context.storyContextPackage ?? {}),
    storyContextVersion: context.storyContextVersion ?? '',
    storyContextAssetPath: context.storyContextAssetPath ?? '',
    tailStateSnapshotJson: JSON.stringify(context.tailStateSnapshot ?? {}),
    characterBibleJson: JSON.stringify(context.storyContextPackage?.characterBible ?? []),
    referenceAssetsJson: JSON.stringify(referenceAssets),
    promptPackageJson: JSON.stringify(promptPackage),
    storyExpansionJson: JSON.stringify(storyExpansion),
    shotPromptJson: JSON.stringify(storyboard.shotPromptPackage),
    storyboardImagesJson: JSON.stringify(storyboardImages),
    storyboardManifestJson: JSON.stringify(storyboardManifest),
    narrationPayloadJson: JSON.stringify(narrationPayload),
    imageTaskStatus: imageTask.status,
    imageTaskPayloadJson: imageTask.payloadJson,
  };
}
