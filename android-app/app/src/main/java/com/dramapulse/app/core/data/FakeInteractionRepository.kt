package com.dramapulse.app.core.data

import com.dramapulse.app.core.model.HighlightStatsModel

class FakeInteractionRepository : InteractionRepository {

    override suspend fun submitInteraction(
        episodeId: String,
        highlightId: String,
        interactionType: String,
        optionText: String
    ): HighlightStatsModel {
        return HighlightStatsModel(
            totalCount = 100,
            uniqueDeviceCount = 75,
            heatLevel = 3,
            topOption = optionText
        )
    }

    override suspend fun reportDanmakuHeat(
        episodeId: String,
        triggerPositionMs: Long,
        sampleContents: List<String>
    ): HighlightHeatReportResult {
        return HighlightHeatReportResult(
            reportId = "fake_heat_${episodeId}_$triggerPositionMs",
            status = "pending"
        )
    }
}
