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
    val type: HighlightType,
    val title: String,
    val description: String,
    val intensity: Int,
    val templateId: HighlightTemplate,
    val interactionOptions: List<HighlightOption>,
    val stats: HighlightStatsModel?
)

enum class HighlightType(val value: String) {
    FEEL_GOOD("feel_good"),
    REVERSAL("reversal"),
    FUNNY("funny"),
    SWEET("sweet"),
    CONFLICT("conflict"),
    SUSPENSE("suspense"),
    EMOTION_BURST("emotion_burst");

    companion object {
        fun from(value: String): HighlightType =
            entries.find { it.value == value } ?: FEEL_GOOD
    }
}

enum class HighlightTemplate(val value: String) {
    EMOTION_BUTTON("emotion_button"),
    VOTE_SIDE("vote_side"),
    BOOST_ACTION("boost_action"),
    SUSPENSE_LOCK("suspense_lock"),
    ENDING_BRANCH("ending_branch");

    companion object {
        fun from(value: String): HighlightTemplate =
            entries.find { it.value == value } ?: EMOTION_BUTTON
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

data class BranchOptionModel(
    val id: String,
    val title: String,
    val description: String,
    val resultType: String,
    val coverUrl: String
)

data class BranchTaskModel(
    val id: String,
    val status: BranchTaskStatus,
    val userPrompt: String,
    val resultTitle: String,
    val resultHook: String,
    val resultStory: String,
    val storyboard: List<StoryboardScene>,
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

data class BranchCommentModel(
    val id: String,
    val content: String,
    val createdAt: String
)
