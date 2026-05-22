package com.dramapulse.app.core.data

import com.dramapulse.app.core.model.HighlightStatsModel

interface InteractionRepository {
    suspend fun submitInteraction(
        episodeId: String,
        highlightId: String,
        interactionType: String,
        optionText: String
    ): HighlightStatsModel
}
