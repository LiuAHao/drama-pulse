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
