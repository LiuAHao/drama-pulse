package com.dramapulse.app.core.data

import com.dramapulse.app.core.model.HighlightStatsModel
import com.dramapulse.app.core.model.remote.CreateInteractionRequest
import com.dramapulse.app.core.network.DramaPulseApi
import com.dramapulse.app.core.network.unwrap

class InteractionRepositoryImpl(
    private val api: DramaPulseApi,
    private val deviceId: String
) : InteractionRepository {

    override suspend fun submitInteraction(
        episodeId: String,
        highlightId: String,
        interactionType: String,
        optionText: String
    ): HighlightStatsModel {
        val response = api.createInteraction(
            CreateInteractionRequest(
                deviceId = deviceId,
                episodeId = episodeId,
                highlightId = highlightId,
                interactionType = interactionType,
                optionText = optionText,
                clientTimestamp = System.currentTimeMillis()
            )
        ).unwrap()
        return response.toModel()
    }
}
