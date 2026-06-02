package com.dramapulse.app.core.model.remote

import kotlinx.serialization.Serializable

@Serializable
data class CreateInteractionRequest(
    val deviceId: String,
    val episodeId: String,
    val highlightId: String,
    val interactionType: String,
    val optionText: String = "",
    val clientTimestamp: Long
)

@Serializable
data class CreateDanmakuHeatReportRequest(
    val deviceId: String,
    val episodeId: String,
    val triggerPositionMs: Long,
    val sampleContents: List<String>,
    val clientTimestamp: Long
)

@Serializable
data class DanmakuHeatReportDto(
    val id: String = "",
    val status: String = "pending"
)
