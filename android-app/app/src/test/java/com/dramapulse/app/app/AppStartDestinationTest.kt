package com.dramapulse.app.app

import org.junit.Assert.assertEquals
import org.junit.Test

class AppStartDestinationTest {

    @Test
    fun `missing server url opens profile when fake data is disabled`() {
        assertEquals(
            AppRoutes.PROFILE,
            resolveStartDestination(
                useFakeData = false,
                baseUrlOrNull = null
            )
        )
    }

    @Test
    fun `configured server url opens drama list when fake data is disabled`() {
        assertEquals(
            AppRoutes.DRAMA_LIST,
            resolveStartDestination(
                useFakeData = false,
                baseUrlOrNull = "http://10.0.2.2:8787/"
            )
        )
    }

    @Test
    fun `fake data keeps drama list as start destination`() {
        assertEquals(
            AppRoutes.DRAMA_LIST,
            resolveStartDestination(
                useFakeData = true,
                baseUrlOrNull = null
            )
        )
    }
}
