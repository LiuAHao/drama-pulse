package com.dramapulse.app.core.model.remote

import kotlinx.serialization.Serializable

@Serializable
data class HighlightDto(
    val id: String,
    val episodeId: String = "",
    val startTimeMs: Long,
    val endTimeMs: Long,
    val interactionStartMs: Long? = null,
    val interactionAppearMs: Long? = null,
    val interactionEndMs: Long? = null,
    val type: String,
    val title: String = "",
    val description: String = "",
    val intensity: Int = 3,
    val templateId: String = "",
    val interactionOptionsJson: String = "[]",
    val visualEffectType: String = "",
    val source: String = "manual",
    val confidence: Double = 1.0,
    val status: String = "confirmed",
    val stats: HighlightStatsDto? = null,
    val createdAt: String = "",
    val updatedAt: String = ""
)

@Serializable
data class HighlightStatsDto(
    val totalCount: Int = 0,
    val uniqueDeviceCount: Int = 0,
    val heatLevel: Int = 0,
    val topOption: String = ""
)
