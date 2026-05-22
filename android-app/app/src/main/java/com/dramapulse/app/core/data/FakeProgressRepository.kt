package com.dramapulse.app.core.data

import com.dramapulse.app.core.model.EpisodeModel

class FakeProgressRepository(
    private val contentRepository: ContentRepository
) : ProgressRepository {

    private val progressMap = mutableMapOf<String, Long>()

    override suspend fun getWatchProgress(): List<WatchProgressEntry> {
        return progressMap.mapNotNull { (episodeId, progressMs) ->
            val episode = runCatching { contentRepository.getEpisodeDetail(episodeId) }.getOrNull()
                ?: return@mapNotNull null
            WatchProgressEntry(
                dramaId = episode.dramaId,
                dramaTitle = episode.title,
                episode = episode,
                progressMs = progressMs
            )
        }
    }

    override suspend fun saveWatchProgress(episodeId: String, progressMs: Long) {
        progressMap[episodeId] = progressMs
    }
}
