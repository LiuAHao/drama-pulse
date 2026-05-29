package com.dramapulse.app.core.network

import org.junit.Assert.assertEquals
import org.junit.Test

class ServerConfigDisplayUrlTest {

    @Test
    fun `display url removes trailing slash`() {
        assertEquals(
            "http://10.0.2.2:8787",
            "http://10.0.2.2:8787/".toDisplayBaseUrl()
        )
    }

    @Test
    fun `display url falls back to empty string when base url is missing`() {
        assertEquals("", (null as String?).toDisplayBaseUrl())
    }
}
