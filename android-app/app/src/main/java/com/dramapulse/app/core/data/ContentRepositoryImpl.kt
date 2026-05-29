package com.dramapulse.app.core.data

import com.dramapulse.app.core.model.*
import com.dramapulse.app.core.model.remote.DramaListData
import com.dramapulse.app.core.network.DramaPulseApi
import com.dramapulse.app.core.network.unwrap
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class ContentRepositoryImpl(
    private val api: DramaPulseApi,
    private val storage: PlayerUiStorage? = null,
    private val json: Json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }
) : ContentRepository {

    override suspend fun getDramas(): DramaListResult {
        return runCatching {
            val response = api.getDramas().unwrap()
            persistDramaList(response)
            response.toDramaListResult()
        }.getOrElse { error ->
            loadCachedDramaList()?.toDramaListResult() ?: throw error
        }
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

    private fun persistDramaList(data: DramaListData) {
        storage?.putString(DRAMA_LIST_CACHE_KEY, json.encodeToString(data))
    }

    private fun loadCachedDramaList(): DramaListData? {
        val raw = storage?.getString(DRAMA_LIST_CACHE_KEY).orEmpty()
        if (raw.isBlank()) return null
        return runCatching { json.decodeFromString<DramaListData>(raw) }.getOrNull()
    }

    private fun DramaListData.toDramaListResult(): DramaListResult {
        return DramaListResult(
            featured = featured.map { it.toCardModel() },
            alternatives = alternatives.map { it.toCardModel() },
            continueWatching = continueWatching?.toModel()
        )
    }

    private companion object {
        private const val DRAMA_LIST_CACHE_KEY = "content_repository_drama_list_cache"
    }
}
