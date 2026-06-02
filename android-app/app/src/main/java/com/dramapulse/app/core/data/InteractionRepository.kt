package com.dramapulse.app.core.data

import com.dramapulse.app.core.model.HighlightStatsModel

data class HighlightHeatReportResult(
    val reportId: String,
    val status: String
)

interface InteractionRepository {
    suspend fun submitInteraction(
        episodeId: String,
        highlightId: String,
        interactionType: String,
        optionText: String
    ): HighlightStatsModel

    suspend fun reportDanmakuHeat(
        episodeId: String,
        triggerPositionMs: Long,
        sampleContents: List<String>
    ): HighlightHeatReportResult
}
