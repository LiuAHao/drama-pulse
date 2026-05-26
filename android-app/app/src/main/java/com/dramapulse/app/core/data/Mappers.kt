package com.dramapulse.app.core.data

import com.dramapulse.app.core.model.*
import com.dramapulse.app.core.model.remote.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

private val json = Json { ignoreUnknownKeys = true }

fun DramaDto.toCardModel(): DramaCardModel {
    val tags = try {
        json.decodeFromString<List<String>>(tagsJson)
    } catch (_: Exception) {
        emptyList()
    }
    return DramaCardModel(
        id = id,
        title = title,
        description = description,
        coverUrl = coverPath,
        mainGenre = mainGenre,
        tags = tags,
        isFeatured = isFeatured
    )
}

fun ContinueWatchingDto.toModel(): ContinueWatchingModel {
    return ContinueWatchingModel(
        drama = drama.toCardModel(),
        episode = episode.toModel(),
        progressMs = progressMs
    )
}

fun EpisodeDto.toModel(): EpisodeModel {
    return EpisodeModel(
        id = id,
        dramaId = dramaId,
        episodeNo = episodeNo,
        title = title,
        videoUrl = videoUrl.ifEmpty { videoPath },
        durationMs = durationMs,
        summary = summary,
        isFinalEpisode = isFinalEpisode,
        hasBranch = hasBranch
    )
}

fun HighlightDto.toModel(): HighlightModel {
    val options = try {
        val parsed = json.decodeFromString<List<HighlightOptionDto>>(interactionOptionsJson)
        parsed.map { HighlightOption(text = it.text, action = it.action) }
    } catch (_: Exception) {
        emptyList()
    }
    return HighlightModel(
        id = id,
        episodeId = episodeId,
        startTimeMs = startTimeMs,
        endTimeMs = endTimeMs,
        interactionStartMs = interactionStartMs ?: startTimeMs,
        interactionAppearMs = interactionAppearMs ?: interactionStartMs ?: startTimeMs,
        interactionEndMs = interactionEndMs ?: (endTimeMs + 1_500),
        type = HighlightType.from(type),
        title = title,
        description = description,
        intensity = intensity,
        interactionOptions = options,
        stats = stats?.toModel()
    )
}

@kotlinx.serialization.Serializable
private data class HighlightOptionDto(
    val text: String,
    val action: String = ""
)

fun HighlightStatsDto.toModel(): HighlightStatsModel {
    return HighlightStatsModel(
        totalCount = totalCount,
        uniqueDeviceCount = uniqueDeviceCount,
        heatLevel = heatLevel,
        topOption = topOption
    )
}

fun BranchOptionDto.toModel(): BranchOptionModel {
    return BranchOptionModel(
        id = id,
        title = title,
        description = description,
        resultType = resultType,
        coverUrl = coverPath
    )
}

fun BranchTaskDto.toModel(): BranchTaskModel {
    val scenes = try {
        json.decodeFromString<List<StoryboardSceneDto>>(storyboardJson)
            .map { StoryboardScene(scene = it.scene, description = it.description, duration = it.duration) }
    } catch (_: Exception) {
        emptyList()
    }
    return BranchTaskModel(
        id = id,
        status = BranchTaskStatus.from(status),
        userPrompt = userPrompt,
        resultTitle = resultTitle,
        resultHook = resultHook,
        resultStory = resultStory,
        storyboard = scenes,
        likeCount = count?.likes ?: 0,
        commentCount = count?.comments ?: 0
    )
}

@kotlinx.serialization.Serializable
private data class StoryboardSceneDto(
    val scene: Int,
    val description: String,
    val duration: Int
)

fun BranchCommentDto.toModel(): BranchCommentModel {
    return BranchCommentModel(
        id = id,
        content = content,
        createdAt = createdAt
    )
}

fun WatchProgressDto.toEntry(): WatchProgressEntry {
    return WatchProgressEntry(
        dramaId = dramaId,
        dramaTitle = drama?.title ?: "",
        episode = episode?.toModel() ?: EpisodeModel(
            id = episodeId,
            dramaId = dramaId,
            episodeNo = 0,
            title = "",
            videoUrl = "",
            durationMs = 0,
            summary = "",
            isFinalEpisode = false,
            hasBranch = false
        ),
        progressMs = progressMs
    )
}
