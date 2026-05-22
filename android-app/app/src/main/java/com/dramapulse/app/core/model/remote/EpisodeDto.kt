package com.dramapulse.app.core.model.remote

import kotlinx.serialization.Serializable

@Serializable
data class EpisodeDto(
    val id: String,
    val dramaId: String = "",
    val episodeNo: Int,
    val title: String,
    val videoPath: String = "",
    val videoUrl: String = "",
    val durationMs: Long = 0,
    val summary: String = "",
    val isFinalEpisode: Boolean = false,
    val hasBranch: Boolean = false,
    val status: String = "active",
    val createdAt: String = "",
    val updatedAt: String = ""
)
