package com.dramapulse.app.core.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlinx.coroutines.test.runTest

class PersistentPlayerUiRepositoryTest {

    @Test
    fun `favorite state persists across repository instances`() = runTest {
        val storage = FakePlayerUiStorage()
        val repo1 = PersistentPlayerUiRepository(storage)

        val firstToggleResult = repo1.toggleFavorite("drama-1")

        val repo2 = PersistentPlayerUiRepository(storage)

        assertTrue(firstToggleResult)
        assertTrue(repo2.isFavorite("drama-1"))
    }

    @Test
    fun `comments persist across repository instances`() = runTest {
        val storage = FakePlayerUiStorage()
        val repo1 = PersistentPlayerUiRepository(storage)

        repo1.addComment("episode-1", "第一条评论")

        val repo2 = PersistentPlayerUiRepository(storage)
        val comments = repo2.getComments("episode-1")

        assertEquals(1, comments.size)
        assertEquals("第一条评论", comments.first().content)
    }

    @Test
    fun `danmaku enabled state persists across repository instances`() {
        val storage = FakePlayerUiStorage()
        val repo1 = PersistentPlayerUiRepository(storage)

        repo1.setDanmakuEnabled("episode-1", false)

        val repo2 = PersistentPlayerUiRepository(storage)

        assertEquals(false, repo2.isDanmakuEnabled("episode-1"))
    }
}

private class FakePlayerUiStorage : PlayerUiStorage {
    private val values = linkedMapOf<String, String>()

    override fun getString(key: String): String? = values[key]

    override fun putString(key: String, value: String) {
        values[key] = value
    }
}
