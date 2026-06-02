export const PIPELINE_STAGES = [
  'queued',
  'context_prepared',
  'prompt_interpreted',
  'story_generated',
  'assets_prepared',
  'storyboard_generated',
  'storyboard_images_generating',
  'storyboard_images_generated',
  'manifest_generated',
  'review_pending',
  'completed',
  'failed',
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const BRANCH_TYPES = ['romance', 'reversal', 'suspense', 'comedy', 'tragedy', 'custom'] as const;
export type BranchType = (typeof BRANCH_TYPES)[number];

export interface StoryContextSeriesOverview {
  seriesPremise?: string;
  mainConflict?: string;
  canonConstraints?: string[];
  tone?: string;
}

export interface StoryContextTailSnapshot {
  currentConflict?: string;
  unresolvedQuestions?: string[];
  branchEntryPoints?: string[];
  hardConstraints?: string[];
}

export interface StoryContextCharacter {
  name?: string;
  role?: string;
  currentState?: string;
  constraints?: string[] | string;
}

export interface EpisodeContext {
  episodeId: string;
  episodeTitle: string;
  episodeSummary: string;
  episodeNo: number;
  dramaId: string;
  dramaTitle: string;
  dramaDescription: string;
  mainGenre: string;
  storyContextVersion?: string;
  storyContextAssetPath?: string;
  storyContextPackage?: {
    seriesOverview?: StoryContextSeriesOverview;
    tailStateSnapshot?: StoryContextTailSnapshot;
    characterBible?: StoryContextCharacter[];
    canonConstraints?: string[];
  } | null;
  tailStateSnapshot?: StoryContextTailSnapshot | null;
}

export interface PromptPackage {
  originalPrompt: string;
  normalizedPrompt: string;
  branchType: BranchType;
  tone: string;
  keywords: string[];
  storyContextVersion?: string;
  canonConstraints?: string[];
  characterFocus?: string[];
  selectedEntryPoint?: string;
  currentConflict?: string;
  unresolvedQuestions?: string[];
  seriesPremise?: string;
  mainConflict?: string;
  targetCardCount?: number;
  generationMode?: 'custom' | 'fixed';
}

export interface StoryCastMember {
  characterName: string;
  roleFunction: string;
  required: boolean;
}

export interface StorySummarySection {
  opening: string;
  development: string;
  twist: string;
  ending: string;
}

export interface StoryExpansion {
  direction: string;
  title: string;
  hook: string;
  story: string;
  summary: StorySummarySection;
  conflict: string;
  twist: string;
  ending: string;
  tags: string[];
  emotionTags: string[];
  storyBeats: string[];
  characterFocus: string[];
  cast: StoryCastMember[];
  endingState: string;
  visualStyle: string;
}

export interface ReferenceAssetItem {
  assetId: string;
  assetType: 'character' | 'scene' | 'style';
  assetPath: string;
  displayName: string;
  usage: string;
  priority: 'required' | 'recommended' | 'optional';
  source: 'local' | 'generated' | 'inferred';
}

export interface ReferenceTaskImageSet {
  characterRefs: ReferenceAssetItem[];
  sceneRefs: ReferenceAssetItem[];
  styleRefs: ReferenceAssetItem[];
  carryNotes: string;
}

export interface ShotCharacterRequirement {
  characterName: string;
  roleInShot: string;
  mustAppear: boolean;
}

export interface ShotAssetReferences {
  requiredCharacterRefs: string[];
  optionalEnvironmentRefs: string[];
  continuityNotes: string[];
}

export interface ShotPrompt {
  scene: number;
  sceneTitle: string;
  plotPurpose: string;
  description: string;
  narrationText: string;
  narrationPlacement: 'below_image';
  dialogueText: string;
  subtitleText: string;
  requiredCharacters: ShotCharacterRequirement[];
  optionalCharacters: ShotCharacterRequirement[];
  characterVisualNotes: string;
  requiredScene: string;
  sceneVisualNotes: string;
  compositionNotes: string;
  imagePrompt: string;
  negativePrompt: string;
  referenceTaskImages: ReferenceTaskImageSet;
  assetReferences: ShotAssetReferences;
  assetCarryNotes: string;
  emotion: string;
  location: string;
}

export interface ShotPromptPackage {
  contractVersion: string;
  storyTitle: string;
  storyHook: string;
  readingMode: 'vertical_comic';
  visualStyle: string;
  globalCharacterConsistencyNotes: string[];
  globalSceneConsistencyNotes: string[];
  shots: ShotPrompt[];
}

export interface StoryboardResult {
  shots: ShotPrompt[];
  shotPromptPackage: ShotPromptPackage;
}

export interface StoryboardImageItem {
  shotId: number;
  sceneTitle: string;
  imagePrompt: string;
  negativePrompt: string;
  imageStatus: 'generated' | 'skipped' | 'failed';
  imageAssetPath: string;
  revisedPrompt?: string;
  requiredCharacters: string[];
  requiredScene: string;
  referenceTaskImages: ReferenceTaskImageSet;
}

export interface StoryboardManifestCard {
  scene: number;
  sceneTitle: string;
  imageAssetPath: string;
  narrationText: string;
  dialogueText: string;
  order: number;
  endingCard: boolean;
}

export interface StoryboardManifest {
  coverImage: string;
  title: string;
  hook: string;
  readingMode: 'vertical_comic';
  cards: StoryboardManifestCard[];
}

export interface NarrationPayload {
  narrationText: string;
  narrationVoice: string;
  narrationAudioStatus: 'not_started';
  narrationAudioPath: string;
}

export interface BranchTaskResult {
  resultTitle: string;
  resultHook: string;
  resultStory: string;
  storyboardJson: string;
  resultTagsJson: string;
  resultInteractionOptionsJson: string;
  branchType: string;
  pipelineStage: PipelineStage;
  storyContextJson: string;
  storyContextVersion: string;
  storyContextAssetPath: string;
  tailStateSnapshotJson: string;
  characterBibleJson: string;
  referenceAssetsJson: string;
  promptPackageJson: string;
  storyExpansionJson: string;
  shotPromptJson: string;
  storyboardImagesJson: string;
  storyboardManifestJson: string;
  narrationPayloadJson: string;
  imageTaskStatus: string;
  imageTaskPayloadJson: string;
}
