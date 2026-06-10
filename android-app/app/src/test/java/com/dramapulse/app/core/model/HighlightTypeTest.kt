package com.dramapulse.app.core.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class HighlightTypeTest {

    @Test
    fun `highlight type enum is frozen to five supported kinds`() {
        assertEquals(
            listOf(
                HighlightType.FEEL_GOOD,
                HighlightType.REVERSAL,
                HighlightType.FUNNY,
                HighlightType.SWEET,
                HighlightType.CONFLICT
            ),
            HighlightType.entries
        )
    }

    @Test
    fun `legacy highlight types fall back to supported default`() {
        assertEquals(HighlightType.FEEL_GOOD, HighlightType.from("suspense"))
        assertEquals(HighlightType.FEEL_GOOD, HighlightType.from("emotion_burst"))
    }

    @Test
    fun `quick prompt depends on low intensity instead of emotion button template alone`() {
        val lowIntensity = buildHighlight(intensity = 2, templateId = HIGHLIGHT_TEMPLATE_EMOTION_BUTTON)
        val highIntensity = buildHighlight(intensity = 4, templateId = HIGHLIGHT_TEMPLATE_EMOTION_BUTTON)

        assertTrue(lowIntensity.isQuickPrompt)
        assertEquals(HIGHLIGHT_TEMPLATE_EMOTION_BUTTON, lowIntensity.compatibilityInteractionType())

        assertFalse(highIntensity.isQuickPrompt)
        assertEquals(HIGHLIGHT_TEMPLATE_BOOST_ACTION, highIntensity.compatibilityInteractionType())
    }

    private fun buildHighlight(
        intensity: Int,
        templateId: String
    ): HighlightModel {
        return HighlightModel(
            id = "highlight-test",
            episodeId = "episode-test",
            startTimeMs = 0L,
            endTimeMs = 5_000L,
            interactionStartMs = 0L,
            interactionAppearMs = 0L,
            interactionEndMs = 5_000L,
            type = HighlightType.FEEL_GOOD,
            title = "测试高光",
            description = "",
            intensity = intensity,
            templateId = templateId,
            interactionOptions = listOf(HighlightOption("爽了")),
            stats = null
        )
    }
}
