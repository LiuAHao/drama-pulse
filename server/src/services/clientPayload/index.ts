import type {
  BranchOption,
  BranchTask,
  Drama,
  Episode,
  Highlight,
  HighlightStats,
  WatchProgress,
} from '@prisma/client';
import { pathToUrl } from '../resource/index.js';

const DEFAULT_HIGHLIGHT_STATS = {
  totalCount: 0,
  uniqueDeviceCount: 0,
  heatLevel: 0,
  topOption: '',
};

export function toClientDrama(drama: Drama, baseUrl: string) {
  return {
    ...drama,
    coverPath: pathToUrl(drama.coverPath, baseUrl),
  };
}

export function toClientEpisode(episode: Episode, baseUrl: string) {
  const videoUrl = pathToUrl(episode.videoPath, baseUrl);
  return {
    ...episode,
    videoPath: videoUrl,
    videoUrl,
  };
}

export function toClientHighlight(
  highlight: Highlight,
  stats?: HighlightStats | null
) {
  return {
    id: highlight.id,
    episodeId: highlight.episodeId,
    startTimeMs: highlight.startTimeMs,
    endTimeMs: highlight.endTimeMs,
    interactionStartMs: highlight.interactionStartMs ?? highlight.startTimeMs,
    interactionAppearMs: highlight.interactionAppearMs ?? highlight.interactionStartMs ?? highlight.startTimeMs,
    interactionEndMs: highlight.interactionEndMs ?? (highlight.endTimeMs + 1500),
    type: highlight.type,
    title: highlight.title,
    description: highlight.description,
    intensity: highlight.intensity,
    templateId: highlight.templateId,
    interactionOptionsJson: highlight.interactionOptionsJson,
    visualEffectType: highlight.visualEffectType,
    source: highlight.source,
    confidence: highlight.confidence,
    status: highlight.status,
    createdAt: highlight.createdAt,
    updatedAt: highlight.updatedAt,
    stats: stats
      ? {
          totalCount: stats.totalCount,
          uniqueDeviceCount: stats.uniqueDeviceCount,
          heatLevel: stats.heatLevel,
          topOption: stats.topOption,
        }
      : DEFAULT_HIGHLIGHT_STATS,
  };
}

export function toClientBranchOption(option: BranchOption, baseUrl: string) {
  return {
    ...option,
    resultContentPath: pathToUrl(option.resultContentPath, baseUrl),
    coverPath: pathToUrl(option.coverPath, baseUrl),
  };
}

type BranchTaskLike = BranchTask & {
  episode?: (Episode & { drama?: Drama | null }) | null;
  drama?: Drama | null;
  _count?: {
    likes: number;
    comments: number;
  };
  count?: {
    likes: number;
    comments: number;
  };
};

export function toClientBranchTask(task: BranchTaskLike, baseUrl: string) {
  const nestedDrama = task.drama
    ? toClientDrama(task.drama, baseUrl)
    : task.episode?.drama
      ? toClientDrama(task.episode.drama, baseUrl)
      : null;

  return {
    id: task.id,
    userId: task.userId,
    deviceId: task.deviceId,
    episodeId: task.episodeId,
    userPrompt: task.userPrompt,
    status: task.status,
    resultTitle: task.resultTitle,
    resultHook: task.resultHook,
    resultStory: task.resultStory,
    storyboardJson: task.storyboardJson,
    resultTagsJson: task.resultTagsJson,
    resultInteractionOptionsJson: task.resultInteractionOptionsJson,
    resultSource: task.resultSource,
    failReason: task.failReason,
    retryCount: task.retryCount,
    createdAt: task.createdAt,
    startedAt: task.startedAt,
    finishedAt: task.finishedAt,
    episode: task.episode ? toClientEpisode(task.episode, baseUrl) : null,
    drama: nestedDrama,
    count: task.count ?? task._count ?? { likes: 0, comments: 0 },
  };
}

type WatchProgressLike = WatchProgress & {
  drama?: Drama | null;
  episode?: Episode | null;
};

export function toClientWatchProgress(progress: WatchProgressLike, baseUrl: string) {
  return {
    id: progress.id,
    userId: progress.userId,
    deviceId: progress.deviceId,
    dramaId: progress.dramaId,
    episodeId: progress.episodeId,
    progressMs: progress.progressMs,
    updatedAt: progress.updatedAt,
    drama: progress.drama ? toClientDrama(progress.drama, baseUrl) : null,
    episode: progress.episode ? toClientEpisode(progress.episode, baseUrl) : null,
  };
}
