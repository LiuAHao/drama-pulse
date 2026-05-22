package com.dramapulse.app.core.model.remote

import kotlinx.serialization.Serializable

@Serializable
data class BranchOptionDto(
    val id: String,
    val episodeId: String = "",
    val title: String,
    val description: String = "",
    val resultType: String = "video",
    val resultContentPath: String = "",
    val coverPath: String = "",
    val sortIndex: Int = 0,
    val status: String = "active"
)

@Serializable
data class BranchTaskDto(
    val id: String,
    val userId: String = "",
    val deviceId: String = "",
    val episodeId: String = "",
    val userPrompt: String = "",
    val status: String = "pending",
    val resultTitle: String = "",
    val resultHook: String = "",
    val resultStory: String = "",
    val storyboardJson: String = "[]",
    val resultTagsJson: String = "[]",
    val resultInteractionOptionsJson: String = "[]",
    val resultSource: String = "llm",
    val failReason: String = "",
    val retryCount: Int = 0,
    val createdAt: String = "",
    val startedAt: String? = null,
    val finishedAt: String? = null,
    val episode: EpisodeDto? = null,
    val drama: DramaDto? = null,
    val count: BranchTaskCount? = null
)

@Serializable
data class BranchTaskCount(
    val likes: Int = 0,
    val comments: Int = 0
)

@Serializable
data class BranchCommentDto(
    val id: String,
    val branchTaskId: String = "",
    val userId: String = "",
    val deviceId: String = "",
    val content: String,
    val status: String = "visible",
    val createdAt: String = "",
    val updatedAt: String = ""
)

@Serializable
data class BranchLikeResponse(
    val likeCount: Int
)

@Serializable
data class CreateBranchTaskRequest(
    val deviceId: String,
    val episodeId: String,
    val userPrompt: String
)

@Serializable
data class BranchLikeRequest(
    val deviceId: String
)

@Serializable
data class CreateBranchCommentRequest(
    val deviceId: String,
    val content: String
)
