package com.dramapulse.app.core.model

import org.junit.Assert.assertEquals
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
}
