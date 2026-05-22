package com.dramapulse.app.feature.branch

import com.dramapulse.app.core.data.BranchCommentPage
import com.dramapulse.app.core.data.BranchRepository
import com.dramapulse.app.core.model.BranchCommentModel
import com.dramapulse.app.core.model.BranchOptionModel
import com.dramapulse.app.core.model.BranchTaskModel
import com.dramapulse.app.core.model.BranchTaskStatus
import com.dramapulse.app.core.model.StoryboardScene
import com.dramapulse.app.testutil.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class BranchViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `select option turns it into a preview result`() = runTest {
        val repo = RecordingBranchRepository()
        val viewModel = BranchViewModel(repo)

        viewModel.onEvent(BranchEvent.LoadOptions("ep-final"))
        runCurrent()

        val selected = repo.options.first()
        viewModel.onEvent(BranchEvent.SelectOption(selected))
        runCurrent()

        val state = viewModel.uiState.value
        assertEquals(BranchScreenState.TASK_SUCCESS, state.screenState)
        assertEquals(selected.title, state.branchTask?.resultTitle)
        assertFalse(state.canInteractWithTask)
        assertTrue(state.comments.isEmpty())
    }

    @Test
    fun `create custom task uses loaded episode id and enables community data on success`() = runTest {
        val repo = RecordingBranchRepository()
        val viewModel = BranchViewModel(repo)

        viewModel.onEvent(BranchEvent.LoadOptions("ep-final"))
        runCurrent()
        viewModel.onEvent(BranchEvent.CreateCustomTask("如果女主没有离开"))
        runCurrent()
        advanceTimeBy(2_000)
        runCurrent()

        val state = viewModel.uiState.value
        assertEquals("ep-final", repo.createdTaskEpisodeId)
        assertEquals("如果女主没有离开", repo.createdTaskPrompt)
        assertEquals(BranchScreenState.TASK_SUCCESS, state.screenState)
        assertTrue(state.canInteractWithTask)
        assertEquals(2, state.commentTotal)
        assertEquals(2, state.comments.size)
    }

    private class RecordingBranchRepository : BranchRepository {
        val options = listOf(
            BranchOptionModel(
                id = "bo-1",
                title = "甜蜜结局",
                description = "主角收获爱情与事业双丰收",
                resultType = "video",
                coverUrl = ""
            ),
            BranchOptionModel(
                id = "bo-2",
                title = "反转结局",
                description = "一个意想不到的结局",
                resultType = "video",
                coverUrl = ""
            )
        )

        var createdTaskEpisodeId: String? = null
        var createdTaskPrompt: String? = null

        override suspend fun getBranchOptions(episodeId: String): List<BranchOptionModel> = options

        override suspend fun createBranchTask(episodeId: String, userPrompt: String): BranchTaskModel {
            createdTaskEpisodeId = episodeId
            createdTaskPrompt = userPrompt
            return buildTask(
                id = "task-1",
                status = BranchTaskStatus.PENDING,
                title = "生成中"
            )
        }

        override suspend fun getBranchTask(taskId: String): BranchTaskModel {
            return buildTask(
                id = taskId,
                status = BranchTaskStatus.SUCCESS,
                title = "她没有离开，而是回来了"
            )
        }

        override suspend fun likeBranchTask(taskId: String): Int = 1

        override suspend fun createComment(taskId: String, content: String): BranchCommentModel {
            return BranchCommentModel(
                id = "c-new",
                content = content,
                createdAt = "2026-05-22T00:00:00Z"
            )
        }

        override suspend fun getComments(taskId: String, page: Int, pageSize: Int): BranchCommentPage {
            return BranchCommentPage(
                items = listOf(
                    BranchCommentModel("c1", "太有代入感了", "2026-05-22T00:00:00Z"),
                    BranchCommentModel("c2", "这个方向比原结局更爽", "2026-05-22T00:01:00Z")
                ),
                total = 2,
                page = 1,
                totalPages = 1
            )
        }

        private fun buildTask(
            id: String,
            status: BranchTaskStatus,
            title: String
        ): BranchTaskModel {
            return BranchTaskModel(
                id = id,
                status = status,
                userPrompt = createdTaskPrompt ?: "",
                resultTitle = title,
                resultHook = "三年后，她以新身份重回宴会现场。",
                resultStory = "这是一段用于测试分支结果流转的故事。",
                storyboard = listOf(
                    StoryboardScene(1, "她回到现场", 5),
                    StoryboardScene(2, "真相被揭开", 8)
                ),
                likeCount = 12,
                commentCount = 2
            )
        }
    }
}
