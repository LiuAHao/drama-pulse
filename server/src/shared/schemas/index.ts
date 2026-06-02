import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().min(1) });

export const dramaIdParamSchema = z.object({ dramaId: z.string().min(1) });
export const episodeIdParamSchema = z.object({ episodeId: z.string().min(1) });
export const highlightIdParamSchema = z.object({ highlightId: z.string().min(1) });
export const taskIdParamSchema = z.object({ taskId: z.string().min(1) });
export const userIdParamSchema = z.object({ userId: z.string().min(1) });
export const userProfileSchema = z.object({
  nickname: z.string().trim().min(1).max(40),
  bio: z.string().trim().max(120).default(''),
  avatarUrl: z.string().url().nullable().optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const optionalPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const createInteractionSchema = z.object({
  deviceId: z.string().min(1),
  episodeId: z.string().min(1),
  highlightId: z.string().min(1),
  interactionType: z.enum(['emotion_button', 'vote_side', 'boost_action', 'suspense_lock']),
  optionText: z.string().default(''),
  clientTimestamp: z.coerce.bigint(),
});

export const createBranchTaskSchema = z.object({
  deviceId: z.string().min(1),
  episodeId: z.string().min(1),
  userPrompt: z.string().min(1).max(500),
});

export const createBranchCommentSchema = z.object({
  deviceId: z.string().min(1),
  content: z.string().min(1).max(500),
});

export const createBranchLikeSchema = z.object({
  deviceId: z.string().min(1),
});

export const createPlayerCommentSchema = z.object({
  deviceId: z.string().min(1).optional(),
  content: z.string().trim().min(1).max(200),
});

export const createDanmakuMessageSchema = z.object({
  deviceId: z.string().min(1).optional(),
  content: z.string().trim().min(1).max(80),
  triggerPositionMs: z.coerce.number().int().min(0),
});

export const upsertWatchProgressSchema = z.object({
  deviceId: z.string().min(1),
  episodeId: z.string().min(1),
  progressMs: z.number().int().min(0),
});

const HIGHLIGHT_TYPES = ['feel_good', 'reversal', 'conflict', 'sweet', 'funny', 'suspense', 'emotion_burst'] as const;
const TEMPLATE_IDS = ['emotion_button', 'vote_side', 'suspense_lock', 'boost_action'] as const;

export const updateHighlightSchema = z.object({
  startTimeMs: z.number().int().min(0).optional(),
  endTimeMs: z.number().int().min(0).optional(),
  interactionStartMs: z.number().int().min(0).nullable().optional(),
  interactionAppearMs: z.number().int().min(0).nullable().optional(),
  interactionEndMs: z.number().int().min(0).nullable().optional(),
  type: z.enum(HIGHLIGHT_TYPES).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  intensity: z.number().int().min(1).max(5).optional(),
  templateId: z.enum(TEMPLATE_IDS).optional(),
  interactionOptionsJson: z.string().optional(),
  visualEffectType: z.string().optional(),
  status: z.enum(['candidate', 'confirmed', 'disabled']).optional(),
  reason: z.string().optional(),
  supportingSegmentIdsJson: z.string().optional(),
  speakerGuess: z.string().optional(),
  targetCharacterGuess: z.string().optional(),
  mentionedCharactersJson: z.string().optional(),
  characterGuessConfidence: z.number().min(0).max(1).nullable().optional(),
});

export const adminHighlightFilterSchema = z.object({
  status: z.enum(['candidate', 'confirmed', 'disabled']).optional(),
  episodeId: z.string().optional(),
}).merge(paginationSchema);

export const adminEpisodeFilterSchema = z.object({
  dramaId: z.string().optional(),
});

export const adminInteractionFilterSchema = z.object({
  highlightId: z.string().optional(),
  deviceId: z.string().optional(),
  episodeId: z.string().optional(),
}).merge(paginationSchema);

export const adminBranchTaskFilterSchema = z.object({
  status: z.string().optional(),
  episodeId: z.string().optional(),
  dramaId: z.string().optional(),
  branchType: z.string().optional(),
  pipelineStage: z.string().optional(),
  imageTaskStatus: z.string().optional(),
}).merge(paginationSchema);

export const adminFavoriteFilterSchema = z.object({
  dramaId: z.string().optional(),
  userId: z.string().optional(),
}).merge(paginationSchema);

export const adminPlayerCommentFilterSchema = z.object({
  dramaId: z.string().optional(),
  episodeId: z.string().optional(),
  userId: z.string().optional(),
  status: z.string().optional(),
}).merge(paginationSchema);

export const adminDanmakuFilterSchema = z.object({
  dramaId: z.string().optional(),
  episodeId: z.string().optional(),
  userId: z.string().optional(),
  status: z.string().optional(),
}).merge(paginationSchema);

export const adminWatchProgressFilterSchema = z.object({
  dramaId: z.string().optional(),
  episodeId: z.string().optional(),
  userId: z.string().optional(),
}).merge(paginationSchema);

export const assetsConfigSchema = z.object({
  videosRoot: z.string().optional(),
  assetsRoot: z.string().optional(),
  exportsRoot: z.string().optional(),
});
