package com.dramapulse.app.core.data

import com.dramapulse.app.core.model.remote.WatchProgressDto
import com.dramapulse.app.core.model.remote.UpsertWatchProgressRequest
import com.dramapulse.app.core.network.DramaPulseApi
import com.dramapulse.app.core.network.unwrap
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class ProgressRepositoryImpl(
    private val api: DramaPulseApi,
    private val deviceId: String,
    private val userId: String,
    private val storage: PlayerUiStorage? = null,
    private val json: Json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }
) : ProgressRepository {

    override suspend fun getWatchProgress(): List<WatchProgressEntry> {
        return runCatching {
            val remote = api.getWatchProgress(userId).unwrap()
            persistProgress(remote)
            remote.map { it.toEntry() }
        }.getOrElse { error ->
            loadCachedProgress()?.map { it.toEntry() } ?: throw error
        }
    }

    override suspend fun saveWatchProgress(episodeId: String, progressMs: Long) {
        val request = UpsertWatchProgressRequest(
            deviceId = deviceId,
            episodeId = episodeId,
            progressMs = progressMs
        )
        runCatching {
            val remote = api.upsertWatchProgress(
                userId = userId,
                request = request
            ).unwrap()
            mergeCachedProgress(remote)
        }.getOrElse {
            mergeCachedProgress(
                WatchProgressDto(
                    id = "local-$episodeId",
                    userId = userId,
                    deviceId = deviceId,
                    episodeId = episodeId,
                    progressMs = progressMs
                )
            )
        }
    }

    private fun persistProgress(items: List<WatchProgressDto>) {
        storage?.putString(WATCH_PROGRESS_CACHE_KEY, json.encodeToString(items))
    }

    private fun mergeCachedProgress(item: WatchProgressDto) {
        val current = loadCachedProgress().orEmpty().toMutableList()
        val index = current.indexOfFirst { it.episodeId == item.episodeId }
        val existing = current.getOrNull(index)
        val merged = item.copy(
            id = item.id.ifBlank { existing?.id.orEmpty() },
            userId = item.userId.ifBlank { existing?.userId.orEmpty() },
            deviceId = item.deviceId.ifBlank { existing?.deviceId.orEmpty() },
            dramaId = item.dramaId.ifBlank { existing?.dramaId.orEmpty() },
            drama = item.drama ?: existing?.drama,
            episode = item.episode ?: existing?.episode,
            updatedAt = item.updatedAt.ifBlank { existing?.updatedAt.orEmpty() }
        )
        if (index >= 0) {
            current[index] = merged
        } else {
            current += merged
        }
        persistProgress(current)
    }

    private fun loadCachedProgress(): List<WatchProgressDto>? {
        val raw = storage?.getString(WATCH_PROGRESS_CACHE_KEY).orEmpty()
        if (raw.isBlank()) return null
        return runCatching { json.decodeFromString<List<WatchProgressDto>>(raw) }.getOrNull()
    }

    private companion object {
        private const val WATCH_PROGRESS_CACHE_KEY = "progress_repository_watch_progress_cache"
    }
}
