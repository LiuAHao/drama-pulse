package com.dramapulse.app.core.model.remote

import kotlinx.serialization.Serializable

@Serializable
data class WatchProgressDto(
    val id: String,
    val userId: String = "",
    val deviceId: String = "",
    val dramaId: String = "",
    val episodeId: String = "",
    val progressMs: Long = 0,
    val updatedAt: String = "",
    val drama: DramaDto? = null,
    val episode: EpisodeDto? = null
)

@Serializable
data class UpsertWatchProgressRequest(
    val deviceId: String,
    val episodeId: String,
    val progressMs: Long
)
