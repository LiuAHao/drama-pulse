package com.dramapulse.app.core.model.remote

import kotlinx.serialization.Serializable

@Serializable
data class UserProfileStatsDto(
    val userId: String = "",
    val nickname: String = "",
    val bio: String = "",
    val avatarUrl: String? = null,
    val watchCount: Int = 0,
    val favoriteCount: Int = 0,
    val branchCount: Int = 0
)

@Serializable
data class FavoriteDramaListDto(
    val dramaIds: List<String> = emptyList(),
    val dramas: List<DramaDto> = emptyList()
)

@Serializable
data class UpdateFavoriteRequest(
    val favorite: Boolean,
    val deviceId: String
)

@Serializable
data class UpdateFavoriteResponse(
    val dramaId: String = "",
    val favorite: Boolean = false,
    val favoriteCount: Int = 0
)

@Serializable
data class PlayerCommentDto(
    val id: String = "",
    val userId: String = "",
    val deviceId: String = "",
    val episodeId: String = "",
    val content: String = "",
    val status: String = "visible",
    val createdAt: String = "",
    val updatedAt: String = ""
)

@Serializable
data class CreatePlayerCommentRequest(
    val content: String,
    val deviceId: String
)

@Serializable
data class DanmakuMessageDto(
    val id: String = "",
    val userId: String = "",
    val deviceId: String = "",
    val episodeId: String = "",
    val content: String = "",
    val triggerPositionMs: Long = 0L,
    val status: String = "visible",
    val createdAt: String = "",
    val updatedAt: String = ""
)

@Serializable
data class CreateDanmakuMessageRequest(
    val content: String,
    val triggerPositionMs: Long,
    val deviceId: String
)
