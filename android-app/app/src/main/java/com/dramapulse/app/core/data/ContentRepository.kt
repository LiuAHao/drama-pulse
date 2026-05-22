package com.dramapulse.app.core.data

import com.dramapulse.app.core.model.*

interface ContentRepository {
    suspend fun getDramas(): DramaListResult
    suspend fun getEpisodes(dramaId: String): List<EpisodeModel>
    suspend fun getEpisodeDetail(episodeId: String): EpisodeModel
    suspend fun getHighlights(episodeId: String): List<HighlightModel>
}

data class DramaListResult(
    val featured: List<DramaCardModel>,
    val alternatives: List<DramaCardModel>,
    val continueWatching: ContinueWatchingModel?
)
