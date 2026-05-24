export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Drama {
  id: string;
  title: string;
  description: string;
  coverPath: string;
  coverUrl: string;
  tagsJson: string;
  mainGenre: string;
  isFeatured: boolean;
  displayOrder: number;
  status: string;
  episodeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Episode {
  id: string;
  dramaId: string;
  episodeNo: number;
  title: string;
  videoPath: string;
  videoUrl: string;
  durationMs: number;
  summary: string;
  isFinalEpisode: boolean;
  hasBranch: boolean;
  status: string;
  drama?: { id: string; title: string };
  createdAt: string;
  updatedAt: string;
}

export interface Highlight {
  id: string;
  episodeId: string;
  startTimeMs: number;
  endTimeMs: number;
  interactionStartMs: number;
  interactionAppearMs: number;
  interactionEndMs: number;
  type: string;
  title: string;
  description: string;
  intensity: number;
  templateId: string;
  interactionOptionsJson: string;
  visualEffectType: string;
  source: string;
  confidence: number;
  status: string;
  reason: string;
  supportingSegmentIdsJson: string;
  speakerGuess: string;
  targetCharacterGuess: string;
  mentionedCharactersJson: string;
  characterGuessConfidence: number | null;
  episode?: { id: string; title: string; episodeNo: number; videoUrl?: string };
  drama?: { id: string; title: string };
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptSegment {
  segmentId: string;
  startTimeMs: number;
  endTimeMs: number;
  text: string;
}

export interface HighlightReviewContext {
  highlight: Highlight;
  transcriptContext: TranscriptSegment[];
  transcriptAvailable: boolean;
  candidateNeighbors: Array<{
    id: string;
    title: string;
    startTimeMs: number;
    endTimeMs: number;
    type: string;
    status: string;
  }>;
}

export interface InteractionEvent {
  id: string;
  userId: string;
  deviceId: string;
  dramaId: string;
  episodeId: string;
  highlightId: string;
  interactionType: string;
  optionText: string;
  clientTimestamp: string;
  serverTimestamp: string;
}

export interface BranchTask {
  id: string;
  userId: string;
  deviceId: string;
  episodeId: string;
  userPrompt: string;
  status: string;
  resultTitle: string;
  resultHook: string;
  resultStory: string;
  storyboardJson: string;
  resultTagsJson: string;
  resultInteractionOptionsJson: string;
  resultSource: string;
  failReason: string;
  retryCount: number;
  episode?: { id: string; title: string; episodeNo: number };
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface AssetsConfigData {
  saved: {
    videosRoot?: string;
    assetsRoot?: string;
    exportsRoot?: string;
  };
  appliedRoots: {
    videosRoot: string;
    assetsRoot: string;
    exportsRoot: string;
  };
}
