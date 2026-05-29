package com.dramapulse.app.core.data

import com.dramapulse.app.core.model.DramaCardModel
import com.dramapulse.app.core.model.EpisodeModel

interface ProgressRepository {
    suspend fun getWatchProgress(): List<WatchProgressEntry>
    suspend fun saveWatchProgress(episodeId: String, progressMs: Long)
}

data class WatchProgressEntry(
    val dramaId: String,
    val drama: DramaCardModel? = null,
    val dramaTitle: String,
    val episode: EpisodeModel,
    val progressMs: Long,
    val updatedAtEpochMs: Long = 0L
)
