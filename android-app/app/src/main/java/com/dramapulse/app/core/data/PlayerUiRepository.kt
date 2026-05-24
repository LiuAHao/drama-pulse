package com.dramapulse.app.core.data

import android.content.SharedPreferences
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@Serializable
data class PlayerCommentEntry(
    val id: String,
    val content: String,
    val createdAtLabel: String
)

@Serializable
data class PlayerDanmakuEntry(
    val id: String,
    val content: String
)

interface PlayerUiRepository {
    fun isFavorite(dramaId: String): Boolean
    fun toggleFavorite(dramaId: String): Boolean
    fun getComments(episodeId: String): List<PlayerCommentEntry>
    fun addComment(episodeId: String, content: String): List<PlayerCommentEntry>
    fun isDanmakuEnabled(episodeId: String): Boolean
    fun setDanmakuEnabled(episodeId: String, enabled: Boolean)
    fun getDanmaku(episodeId: String): List<PlayerDanmakuEntry>
    fun addDanmaku(episodeId: String, content: String): List<PlayerDanmakuEntry>
}

interface PlayerUiStorage {
    fun getString(key: String): String?
    fun putString(key: String, value: String)
}

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

    override fun isFavorite(dramaId: String): Boolean = dramaId in snapshot.favoriteDramaIds

    override fun toggleFavorite(dramaId: String): Boolean {
        val updatedFavorites = snapshot.favoriteDramaIds.toMutableSet()
        val nowFavorite = if (dramaId in updatedFavorites) {
            updatedFavorites.remove(dramaId)
            false
        } else {
            updatedFavorites.add(dramaId)
            true
        }
        snapshot = snapshot.copy(favoriteDramaIds = updatedFavorites)
        persist()
        return nowFavorite
    }

    override fun getComments(episodeId: String): List<PlayerCommentEntry> {
        return snapshot.commentsByEpisodeId[episodeId].orEmpty()
    }

    override fun addComment(episodeId: String, content: String): List<PlayerCommentEntry> {
        val current = snapshot.commentsByEpisodeId[episodeId].orEmpty()
        val updated = listOf(
            PlayerCommentEntry(
                id = "comment_${System.currentTimeMillis()}",
                content = content,
                createdAtLabel = "刚刚"
            )
        ) + current
        snapshot = snapshot.copy(
            commentsByEpisodeId = snapshot.commentsByEpisodeId + (episodeId to updated)
        )
        persist()
        return updated
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

    override fun getDanmaku(episodeId: String): List<PlayerDanmakuEntry> {
        return snapshot.danmakuByEpisodeId[episodeId].orEmpty()
    }

    override fun addDanmaku(episodeId: String, content: String): List<PlayerDanmakuEntry> {
        val current = snapshot.danmakuByEpisodeId[episodeId].orEmpty()
        val updated = (
            listOf(
                PlayerDanmakuEntry(
                    id = "danmaku_${System.currentTimeMillis()}",
                    content = content
                )
            ) + current
        ).take(8)
        snapshot = snapshot.copy(
            danmakuByEpisodeId = snapshot.danmakuByEpisodeId + (episodeId to updated)
        )
        persist()
        return updated
    }

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
}

class InMemoryPlayerUiRepository : PlayerUiRepository {
    private val delegate = PersistentPlayerUiRepository(storage = InMemoryPlayerUiStorage())

    override fun isFavorite(dramaId: String): Boolean = delegate.isFavorite(dramaId)

    override fun toggleFavorite(dramaId: String): Boolean = delegate.toggleFavorite(dramaId)

    override fun getComments(episodeId: String): List<PlayerCommentEntry> = delegate.getComments(episodeId)

    override fun addComment(episodeId: String, content: String): List<PlayerCommentEntry> {
        return delegate.addComment(episodeId, content)
    }

    override fun isDanmakuEnabled(episodeId: String): Boolean = delegate.isDanmakuEnabled(episodeId)

    override fun setDanmakuEnabled(episodeId: String, enabled: Boolean) {
        delegate.setDanmakuEnabled(episodeId, enabled)
    }

    override fun getDanmaku(episodeId: String): List<PlayerDanmakuEntry> = delegate.getDanmaku(episodeId)

    override fun addDanmaku(episodeId: String, content: String): List<PlayerDanmakuEntry> {
        return delegate.addDanmaku(episodeId, content)
    }
}

private class InMemoryPlayerUiStorage : PlayerUiStorage {
    private val values = linkedMapOf<String, String>()

    override fun getString(key: String): String? = values[key]

    override fun putString(key: String, value: String) {
        values[key] = value
    }
}
