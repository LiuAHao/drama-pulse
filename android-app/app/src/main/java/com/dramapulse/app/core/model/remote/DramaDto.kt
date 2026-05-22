package com.dramapulse.app.core.model.remote

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class DramaDto(
    val id: String,
    val title: String,
    val description: String = "",
    val coverPath: String = "",
    val tagsJson: String = "[]",
    val mainGenre: String = "",
    val isFeatured: Boolean = false,
    val displayOrder: Int = 0,
    val status: String = "active",
    val createdAt: String = "",
    val updatedAt: String = ""
)

@Serializable
data class DramaListData(
    val featured: List<DramaDto>,
    val alternatives: List<DramaDto>,
    val continueWatching: ContinueWatchingDto? = null
)

@Serializable
data class ContinueWatchingDto(
    val drama: DramaDto,
    val episode: EpisodeDto,
    val progressMs: Long
)
