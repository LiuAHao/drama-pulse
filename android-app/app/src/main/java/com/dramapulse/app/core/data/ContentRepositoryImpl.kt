package com.dramapulse.app.core.data

import com.dramapulse.app.core.model.*
import com.dramapulse.app.core.network.DramaPulseApi
import com.dramapulse.app.core.network.unwrap

class ContentRepositoryImpl(
    private val api: DramaPulseApi
) : ContentRepository {

    override suspend fun getDramas(): DramaListResult {
        val response = api.getDramas().unwrap()
        return DramaListResult(
            featured = response.featured.map { it.toCardModel() },
            alternatives = response.alternatives.map { it.toCardModel() },
            continueWatching = response.continueWatching?.toModel()
        )
    }

    override suspend fun getEpisodes(dramaId: String): List<EpisodeModel> {
        return api.getEpisodes(dramaId).unwrap().map { it.toModel() }
    }

    override suspend fun getEpisodeDetail(episodeId: String): EpisodeModel {
        return api.getEpisodeDetail(episodeId).unwrap().toModel()
    }

    override suspend fun getHighlights(episodeId: String): List<HighlightModel> {
        return api.getHighlights(episodeId).unwrap().map { it.toModel() }
    }
}
