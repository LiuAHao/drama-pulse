import { prisma } from '../../shared/db/index.js';
import type { EpisodeContext } from './types.js';
import { loadStoryContextForDrama } from './storyContextLoader.js';

export async function buildEpisodeContext(episodeId: string): Promise<EpisodeContext> {
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: { drama: true },
  });

  if (!episode) {
    throw new Error(`Episode not found: ${episodeId}`);
  }

  const storyContextAttachment = await loadStoryContextForDrama(episode.drama.id);

  return {
    episodeId: episode.id,
    episodeTitle: episode.title,
    episodeSummary: episode.summary,
    episodeNo: episode.episodeNo,
    dramaId: episode.drama.id,
    dramaTitle: episode.drama.title,
    dramaDescription: episode.drama.description,
    mainGenre: episode.drama.mainGenre,
    storyContextVersion: storyContextAttachment?.storyContextVersion,
    storyContextAssetPath: storyContextAttachment?.storyContextAssetPath,
    storyContextPackage: storyContextAttachment?.storyContextPackage,
    tailStateSnapshot: storyContextAttachment?.tailStateSnapshot,
  };
}
