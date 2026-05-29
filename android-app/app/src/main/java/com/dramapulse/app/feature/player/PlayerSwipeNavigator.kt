package com.dramapulse.app.feature.player

enum class VerticalSwipeAction {
    NONE,
    PREVIOUS_EPISODE,
    NEXT_EPISODE,
    REACHED_START,
    REACHED_END
}

fun resolveVerticalSwipeAction(
    accumulatedDrag: Float,
    thresholdPx: Float,
    currentEpisodeIndex: Int,
    episodeCount: Int
): VerticalSwipeAction {
    if (episodeCount <= 0) return VerticalSwipeAction.NONE

    return when {
        accumulatedDrag > thresholdPx -> {
            val isFirstEpisode = currentEpisodeIndex <= 0
            if (isFirstEpisode) VerticalSwipeAction.REACHED_START else VerticalSwipeAction.PREVIOUS_EPISODE
        }

        accumulatedDrag < -thresholdPx -> {
            val isLastEpisode = currentEpisodeIndex >= episodeCount - 1
            if (isLastEpisode) VerticalSwipeAction.REACHED_END else VerticalSwipeAction.NEXT_EPISODE
        }

        else -> VerticalSwipeAction.NONE
    }
}
