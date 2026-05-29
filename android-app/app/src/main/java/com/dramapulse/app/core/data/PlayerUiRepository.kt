package com.dramapulse.app.core.data

import android.content.SharedPreferences
import com.dramapulse.app.core.model.remote.CreateDanmakuMessageRequest
import com.dramapulse.app.core.model.remote.CreatePlayerCommentRequest
import com.dramapulse.app.core.model.remote.UpdateFavoriteRequest
import com.dramapulse.app.core.network.DramaPulseApi
import com.dramapulse.app.core.network.unwrap
import com.dramapulse.app.core.util.toEpochMillisOrNow
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Serializable
data class PlayerCommentEntry(
    val id: String,
    val content: String,
    val createdAtLabel: String,
    val createdAtEpochMs: Long = System.currentTimeMillis()
)

@Serializable
data class PlayerDanmakuEntry(
    val id: String,
    val content: String,
    val createdAtEpochMs: Long,
    val triggerPositionMs: Long
)

interface PlayerUiRepository {
    suspend fun isFavorite(dramaId: String): Boolean
    suspend fun toggleFavorite(dramaId: String): Boolean
    suspend fun getComments(episodeId: String): List<PlayerCommentEntry>
    suspend fun addComment(episodeId: String, content: String, createdAtEpochMs: Long = System.currentTimeMillis()): List<PlayerCommentEntry>
    fun isDanmakuEnabled(episodeId: String): Boolean
    fun setDanmakuEnabled(episodeId: String, enabled: Boolean)
    suspend fun getDanmaku(episodeId: String): List<PlayerDanmakuEntry>
    suspend fun addDanmaku(
        episodeId: String,
        content: String,
        triggerPositionMs: Long,
        createdAtEpochMs: Long = System.currentTimeMillis()
    ): List<PlayerDanmakuEntry>
    suspend fun getFavoriteCount(): Int = 0
}

interface PlayerUiStorage {
    fun getString(key: String): String?
    fun putString(key: String, value: String)
}

private data class FavoriteSnapshotMutation(
    val updatedSnapshot: PlayerUiStateSnapshot,
    val isFavorite: Boolean
)

class SharedPreferencesPlayerUiStorage(
    private val sharedPreferences: SharedPreferences
) : PlayerUiStorage {
    override fun getString(key: String): String? = sharedPreferences.getString(key, null)

    override fun putString(key: String, value: String) {
        sharedPreferences.edit().putString(key, value).apply()
    }
}

@Serializable
private data class PlayerUiStateSnapshot(
    val favoriteDramaIds: Set<String> = emptySet(),
    val commentsByEpisodeId: Map<String, List<PlayerCommentEntry>> = emptyMap(),
    val danmakuEnabledByEpisodeId: Map<String, Boolean> = emptyMap(),
    val danmakuByEpisodeId: Map<String, List<PlayerDanmakuEntry>> = emptyMap()
)

class PersistentPlayerUiRepository(
    private val storage: PlayerUiStorage,
    private val json: Json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }
) : PlayerUiRepository {

    private val stateKey = "player_ui_state"
    private var snapshot = loadSnapshot()

    override suspend fun isFavorite(dramaId: String): Boolean = dramaId in snapshot.favoriteDramaIds

    override suspend fun toggleFavorite(dramaId: String): Boolean {
        val mutation = mutateFavoriteSnapshot(dramaId = dramaId, favorite = dramaId !in snapshot.favoriteDramaIds)
        snapshot = mutation.updatedSnapshot
        persist()
        return mutation.isFavorite
    }

    fun setFavorite(dramaId: String, favorite: Boolean) {
        snapshot = mutateFavoriteSnapshot(dramaId = dramaId, favorite = favorite).updatedSnapshot
        persist()
    }

    fun replaceFavorites(dramaIds: Set<String>) {
        snapshot = snapshot.copy(favoriteDramaIds = dramaIds)
        persist()
    }

    override suspend fun getComments(episodeId: String): List<PlayerCommentEntry> {
        return snapshot.commentsByEpisodeId[episodeId].orEmpty()
    }

    override suspend fun addComment(
        episodeId: String,
        content: String,
        createdAtEpochMs: Long
    ): List<PlayerCommentEntry> {
        val current = snapshot.commentsByEpisodeId[episodeId].orEmpty()
        val updated = listOf(
            PlayerCommentEntry(
                id = "comment_${System.currentTimeMillis()}",
                content = content,
                createdAtLabel = formatTimestampLabel(createdAtEpochMs),
                createdAtEpochMs = createdAtEpochMs
            )
        ) + current
        snapshot = snapshot.copy(
            commentsByEpisodeId = snapshot.commentsByEpisodeId + (episodeId to updated)
        )
        persist()
        return updated
    }

    fun replaceComments(
        episodeId: String,
        comments: List<PlayerCommentEntry>
    ) {
        snapshot = snapshot.copy(
            commentsByEpisodeId = snapshot.commentsByEpisodeId + (episodeId to comments)
        )
        persist()
    }

    override fun isDanmakuEnabled(episodeId: String): Boolean {
        return snapshot.danmakuEnabledByEpisodeId[episodeId] ?: true
    }

    override fun setDanmakuEnabled(episodeId: String, enabled: Boolean) {
        snapshot = snapshot.copy(
            danmakuEnabledByEpisodeId = snapshot.danmakuEnabledByEpisodeId + (episodeId to enabled)
        )
        persist()
    }

    override suspend fun getDanmaku(episodeId: String): List<PlayerDanmakuEntry> {
        return snapshot.danmakuByEpisodeId[episodeId].orEmpty()
    }

    override suspend fun addDanmaku(
        episodeId: String,
        content: String,
        triggerPositionMs: Long,
        createdAtEpochMs: Long
    ): List<PlayerDanmakuEntry> {
        val current = snapshot.danmakuByEpisodeId[episodeId].orEmpty()
        val updated = (
            listOf(
                PlayerDanmakuEntry(
                    id = "danmaku_${System.currentTimeMillis()}",
                    content = content,
                    createdAtEpochMs = createdAtEpochMs,
                    triggerPositionMs = triggerPositionMs
                )
            ) + current
        ).sortedByDescending { it.createdAtEpochMs }
            .take(30)
        snapshot = snapshot.copy(
            danmakuByEpisodeId = snapshot.danmakuByEpisodeId + (episodeId to updated)
        )
        persist()
        return updated
    }

    fun replaceDanmaku(
        episodeId: String,
        danmaku: List<PlayerDanmakuEntry>
    ) {
        snapshot = snapshot.copy(
            danmakuByEpisodeId = snapshot.danmakuByEpisodeId + (episodeId to danmaku)
        )
        persist()
    }

    suspend fun getFavoriteDramaIds(): Set<String> = snapshot.favoriteDramaIds

    private fun loadSnapshot(): PlayerUiStateSnapshot {
        val raw = storage.getString(stateKey).orEmpty()
        if (raw.isBlank()) return PlayerUiStateSnapshot()
        return runCatching {
            json.decodeFromString<PlayerUiStateSnapshot>(raw)
        }.getOrDefault(PlayerUiStateSnapshot())
    }

    private fun persist() {
        storage.putString(stateKey, json.encodeToString(snapshot))
    }

    private fun mutateFavoriteSnapshot(
        dramaId: String,
        favorite: Boolean
    ): FavoriteSnapshotMutation {
        val updatedFavorites = snapshot.favoriteDramaIds.toMutableSet()
        if (favorite) {
            updatedFavorites.add(dramaId)
        } else {
            updatedFavorites.remove(dramaId)
        }
        return FavoriteSnapshotMutation(
            updatedSnapshot = snapshot.copy(favoriteDramaIds = updatedFavorites),
            isFavorite = favorite
        )
    }
}

class InMemoryPlayerUiRepository : PlayerUiRepository {
    private val delegate = PersistentPlayerUiRepository(storage = InMemoryPlayerUiStorage())

    override suspend fun isFavorite(dramaId: String): Boolean = delegate.isFavorite(dramaId)

    override suspend fun toggleFavorite(dramaId: String): Boolean = delegate.toggleFavorite(dramaId)

    override suspend fun getComments(episodeId: String): List<PlayerCommentEntry> = delegate.getComments(episodeId)

    override suspend fun addComment(episodeId: String, content: String, createdAtEpochMs: Long): List<PlayerCommentEntry> {
        return delegate.addComment(episodeId, content, createdAtEpochMs)
    }

    override fun isDanmakuEnabled(episodeId: String): Boolean = delegate.isDanmakuEnabled(episodeId)

    override fun setDanmakuEnabled(episodeId: String, enabled: Boolean) {
        delegate.setDanmakuEnabled(episodeId, enabled)
    }

    override suspend fun getDanmaku(episodeId: String): List<PlayerDanmakuEntry> = delegate.getDanmaku(episodeId)

    override suspend fun addDanmaku(
        episodeId: String,
        content: String,
        triggerPositionMs: Long,
        createdAtEpochMs: Long
    ): List<PlayerDanmakuEntry> {
        return delegate.addDanmaku(episodeId, content, triggerPositionMs, createdAtEpochMs)
    }
}

class RemoteFirstPlayerUiRepository(
    private val api: DramaPulseApi,
    private val userId: String,
    private val deviceId: String,
    private val localCache: PersistentPlayerUiRepository
) : PlayerUiRepository {

    private var favoriteDramaIdsCache: Set<String>? = null

    override suspend fun isFavorite(dramaId: String): Boolean {
        val favorites = favoriteDramaIdsCache ?: loadFavoriteIds()
        return dramaId in favorites
    }

    override suspend fun toggleFavorite(dramaId: String): Boolean {
        val nowFavorite = !isFavorite(dramaId)
        api.updateFavoriteDrama(
            userId = userId,
            dramaId = dramaId,
            request = UpdateFavoriteRequest(
                favorite = nowFavorite,
                deviceId = deviceId
            )
        ).unwrap()
        favoriteDramaIdsCache = if (nowFavorite) {
            (favoriteDramaIdsCache.orEmpty() + dramaId)
        } else {
            (favoriteDramaIdsCache.orEmpty() - dramaId)
        }
        localCache.setFavorite(dramaId, nowFavorite)
        return nowFavorite
    }

    override suspend fun getComments(episodeId: String): List<PlayerCommentEntry> {
        return runCatching {
            api.getPlayerComments(episodeId).unwrap().map { dto ->
                PlayerCommentEntry(
                    id = dto.id,
                    content = dto.content,
                    createdAtLabel = formatTimestampLabel(dto.createdAt.toEpochMillisOrNow()),
                    createdAtEpochMs = dto.createdAt.toEpochMillisOrNow()
                )
            }.also { localCache.replaceComments(episodeId, it) }
        }.getOrElse {
            localCache.getComments(episodeId)
        }
    }

    override suspend fun addComment(
        episodeId: String,
        content: String,
        createdAtEpochMs: Long
    ): List<PlayerCommentEntry> {
        api.createPlayerComment(
            episodeId = episodeId,
            request = CreatePlayerCommentRequest(
                content = content,
                deviceId = deviceId
            )
        ).unwrap()
        return getComments(episodeId)
    }

    override fun isDanmakuEnabled(episodeId: String): Boolean = localCache.isDanmakuEnabled(episodeId)

    override fun setDanmakuEnabled(episodeId: String, enabled: Boolean) {
        localCache.setDanmakuEnabled(episodeId, enabled)
    }

    override suspend fun getDanmaku(episodeId: String): List<PlayerDanmakuEntry> {
        return runCatching {
            api.getDanmakuMessages(episodeId).unwrap().map { dto ->
                PlayerDanmakuEntry(
                    id = dto.id,
                    content = dto.content,
                    createdAtEpochMs = dto.createdAt.toEpochMillisOrNow(),
                    triggerPositionMs = dto.triggerPositionMs
                )
            }.also { localCache.replaceDanmaku(episodeId, it) }
        }.getOrElse {
            localCache.getDanmaku(episodeId)
        }
    }

    override suspend fun addDanmaku(
        episodeId: String,
        content: String,
        triggerPositionMs: Long,
        createdAtEpochMs: Long
    ): List<PlayerDanmakuEntry> {
        api.createDanmakuMessage(
            episodeId = episodeId,
            request = CreateDanmakuMessageRequest(
                content = content,
                triggerPositionMs = triggerPositionMs,
                deviceId = deviceId
            )
        ).unwrap()
        return getDanmaku(episodeId)
    }

    override suspend fun getFavoriteCount(): Int {
        return favoriteDramaIdsCache?.size ?: loadFavoriteIds().size
    }

    private suspend fun loadFavoriteIds(): Set<String> {
        val ids = runCatching {
            api.getFavoriteDramaIds(userId).unwrap().dramaIds.toSet()
        }.getOrElse {
            localCache.getFavoriteDramaIds()
        }
        favoriteDramaIdsCache = ids
        localCache.replaceFavorites(ids)
        return ids
    }
}

private class InMemoryPlayerUiStorage : PlayerUiStorage {
    private val values = linkedMapOf<String, String>()

    override fun getString(key: String): String? = values[key]

    override fun putString(key: String, value: String) {
        values[key] = value
    }
}

private fun formatTimestampLabel(epochMs: Long): String {
    return DateTimeFormatter.ofPattern("MM-dd HH:mm")
        .withZone(ZoneId.systemDefault())
        .format(Instant.ofEpochMilli(epochMs))
}
