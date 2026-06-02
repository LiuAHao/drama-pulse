package com.dramapulse.app.core.data

import com.dramapulse.app.core.model.remote.BranchOptionDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class BranchMappersTest {

    @Test
    fun `branch option mapper keeps generated fixed branch payload fields`() {
        val dto = BranchOptionDto(
            id = "bo-fixed-1",
            title = "联手反击线",
            description = "基于尾集上下文预生成的固定分支",
            resultType = "video",
            resultContentPath = "https://example.com/video.mp4",
            coverPath = "https://example.com/cover.jpg",
            generatedPayloadPath = "https://example.com/fixed.json",
            generatedAt = "2026-05-31T12:00:00Z",
            resultHook = "江青纸决定先合作，再复仇。",
            resultStory = "尾集之后，她没有继续硬碰硬，而是先把真正的敌人逼出来。",
            storyboardJson = """[
              {"scene":1,"description":"她把证据拍在桌上","duration":4},
              {"scene":2,"description":"两人短暂联手","duration":6}
            ]""",
            shotPromptJson = """[{"scene":1,"prompt":"close-up dramatic light"}]"""
        )

        val model = dto.toModel()

        assertEquals("https://example.com/fixed.json", model.generatedPayloadUrl)
        assertEquals("2026-05-31T12:00:00Z", model.generatedAt)
        assertEquals("江青纸决定先合作，再复仇。", model.resultHook)
        assertTrue(model.resultStory.contains("真正的敌人"))
        assertEquals(2, model.storyboard.size)
        assertEquals("她把证据拍在桌上", model.storyboard[0].description)
        assertEquals("""[{"scene":1,"prompt":"close-up dramatic light"}]""", model.shotPromptJson)
    }
}
