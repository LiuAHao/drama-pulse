package com.dramapulse.app.feature.player

import org.junit.Assert.assertEquals
import org.junit.Test

class PlayerSwipeNavigatorTest {

    @Test
    fun `downward swipe goes to previous episode when previous exists`() {
        val action = resolveVerticalSwipeAction(
            accumulatedDrag = 160f,
            thresholdPx = 120f,
            currentEpisodeIndex = 1,
            episodeCount = 3
        )

        assertEquals(VerticalSwipeAction.PREVIOUS_EPISODE, action)
    }

    @Test
    fun `upward swipe goes to next episode when next exists`() {
        val action = resolveVerticalSwipeAction(
            accumulatedDrag = -160f,
            thresholdPx = 120f,
            currentEpisodeIndex = 1,
            episodeCount = 3
        )

        assertEquals(VerticalSwipeAction.NEXT_EPISODE, action)
    }

    @Test
    fun `downward swipe at first episode shows reached start`() {
        val action = resolveVerticalSwipeAction(
            accumulatedDrag = 160f,
            thresholdPx = 120f,
            currentEpisodeIndex = 0,
            episodeCount = 3
        )

        assertEquals(VerticalSwipeAction.REACHED_START, action)
    }

    @Test
    fun `upward swipe at last episode shows reached end`() {
        val action = resolveVerticalSwipeAction(
            accumulatedDrag = -160f,
            thresholdPx = 120f,
            currentEpisodeIndex = 2,
            episodeCount = 3
        )

        assertEquals(VerticalSwipeAction.REACHED_END, action)
    }
}
