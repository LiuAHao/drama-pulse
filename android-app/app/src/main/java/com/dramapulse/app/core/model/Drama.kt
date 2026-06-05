package com.dramapulse.app.core.model

data class DramaCardModel(
    val id: String,
    val title: String,
    val description: String,
    val coverUrl: String,
    val mainGenre: String,
    val tags: List<String>,
    val isFeatured: Boolean,
    val heat: Int = 0
)

data class ContinueWatchingModel(
    val drama: DramaCardModel,
    val episode: EpisodeModel,
    val progressMs: Long
)

data class EpisodeModel(
    val id: String,
    val dramaId: String,
    val episodeNo: Int,
    val title: String,
    val videoUrl: String,
    val durationMs: Long,
    val summary: String,
    val isFinalEpisode: Boolean,
    val hasBranch: Boolean
)

data class HighlightModel(
    val id: String,
    val episodeId: String,
    val startTimeMs: Long,
    val endTimeMs: Long,
    val interactionStartMs: Long,
    val interactionAppearMs: Long,
    val interactionEndMs: Long,
    val type: HighlightType,
    val title: String,
    val description: String,
    val intensity: Int,
    val templateId: String = "",
    val visualEffectType: String = "",
    val source: String = "manual",
    val confidence: Double = 1.0,
    val status: String = "confirmed",
    val createdAt: String = "",
    val updatedAt: String = "",
    val interactionOptions: List<HighlightOption>,
    val stats: HighlightStatsModel?
) {
    val isQuickPrompt: Boolean
        get() = templateId == HIGHLIGHT_TEMPLATE_EMOTION_BUTTON || intensity <= 2

    fun isVisibleAt(positionMs: Long): Boolean =
        positionMs in interactionAppearMs..interactionEndMs

    fun isInteractableAt(positionMs: Long): Boolean =
        positionMs in interactionStartMs..interactionEndMs

    fun compatibilityInteractionType(): String =
        when (templateId) {
            HIGHLIGHT_TEMPLATE_EMOTION_BUTTON,
            HIGHLIGHT_TEMPLATE_VOTE_SIDE,
            HIGHLIGHT_TEMPLATE_SUSPENSE_LOCK -> templateId
            else -> if (isQuickPrompt) HIGHLIGHT_TEMPLATE_EMOTION_BUTTON else HIGHLIGHT_TEMPLATE_BOOST_ACTION
        }

    fun isClientDisplayable(): Boolean =
        status == "confirmed"

    fun activationPriorityScore(): Int {
        val templateScore = when (compatibilityInteractionType()) {
            HIGHLIGHT_TEMPLATE_SUSPENSE_LOCK -> 40
            HIGHLIGHT_TEMPLATE_BOOST_ACTION -> 30
            HIGHLIGHT_TEMPLATE_VOTE_SIDE -> 20
            HIGHLIGHT_TEMPLATE_EMOTION_BUTTON -> 10
            else -> 0
        }
        val effectScore = when (visualEffectType) {
            "burst" -> 6
            "glow" -> 4
            "shake" -> 3
            "sticker" -> 1
            else -> 0
        }
        val confidenceScore = (confidence * 10).toInt().coerceIn(0, 10)
        return (intensity * 100) + templateScore + effectScore + confidenceScore
    }

    fun optionTextAt(clickIndex: Int): String {
        if (interactionOptions.isEmpty()) {
            return title.ifBlank { type.fallbackOptionText() }
        }
        return interactionOptions[clickIndex.mod(interactionOptions.size)].text
    }
}

enum class HighlightType(val value: String) {
    FEEL_GOOD("feel_good"),
    REVERSAL("reversal"),
    FUNNY("funny"),
    SWEET("sweet"),
    CONFLICT("conflict");

    companion object {
        fun from(value: String): HighlightType =
            entries.find { it.value == value } ?: FEEL_GOOD
    }

    fun fallbackOptionText(): String = when (this) {
        FEEL_GOOD -> "爽了"
        REVERSAL -> "卧槽"
        FUNNY -> "笑死"
        SWEET -> "心暖了"
        CONFLICT -> "烧起来了"
    }
}

data class HighlightOption(
    val text: String,
    val action: String = ""
)

data class HighlightStatsModel(
    val totalCount: Int,
    val uniqueDeviceCount: Int,
    val heatLevel: Int,
    val topOption: String
)

const val HIGHLIGHT_TEMPLATE_EMOTION_BUTTON = "emotion_button"
const val HIGHLIGHT_TEMPLATE_VOTE_SIDE = "vote_side"
const val HIGHLIGHT_TEMPLATE_SUSPENSE_LOCK = "suspense_lock"
const val HIGHLIGHT_TEMPLATE_BOOST_ACTION = "boost_action"

data class BranchOptionModel(
    val id: String,
    val title: String,
    val description: String,
    val resultType: String,
    val coverUrl: String,
    val resultContentUrl: String = "",
    val generatedPayloadUrl: String = "",
    val generatedAt: String = "",
    val resultHook: String = "",
    val resultStory: String = "",
    val storyboard: List<StoryboardScene> = emptyList(),
    val storyboardCards: List<StoryboardCard> = emptyList(),
    val shotPromptJson: String = "[]"
)

data class BranchTaskModel(
    val id: String,
    val status: BranchTaskStatus,
    val userPrompt: String,
    val resultTitle: String,
    val resultHook: String,
    val resultStory: String,
    val storyboard: List<StoryboardScene>,
    val storyboardCards: List<StoryboardCard> = emptyList(),
    val storyboardImages: List<StoryboardImage>,
    val likeCount: Int,
    val commentCount: Int
)

enum class BranchTaskStatus(val value: String) {
    PENDING("pending"),
    RUNNING("running"),
    SUCCESS("success"),
    FAILED("failed"),
    TIMEOUT("timeout"),
    BLOCKED("blocked");

    companion object {
        fun from(value: String): BranchTaskStatus =
            entries.find { it.value == value } ?: FAILED
    }
}

data class StoryboardScene(
    val scene: Int,
    val description: String,
    val duration: Int
)

data class StoryboardCard(
    val scene: Int,
    val sceneTitle: String,
    val imageUrl: String,
    val narrationText: String,
    val dialogueText: String,
    val order: Int,
    val endingCard: Boolean
)

data class StoryboardImage(
    val scene: Int,
    val imageUrl: String
)

data class BranchCommentModel(
    val id: String,
    val content: String,
    val createdAt: String
)
