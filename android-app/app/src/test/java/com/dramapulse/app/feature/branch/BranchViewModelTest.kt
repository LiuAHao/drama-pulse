package com.dramapulse.app.feature.branch

import com.dramapulse.app.core.data.BranchCommentPage
import com.dramapulse.app.core.data.BranchRepository
import com.dramapulse.app.core.model.BranchCommentModel
import com.dramapulse.app.core.model.BranchOptionModel
import com.dramapulse.app.core.model.BranchTaskModel
import com.dramapulse.app.core.model.BranchTaskStatus
import com.dramapulse.app.core.model.StoryboardCard
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
        assertEquals(selected.id, state.selectedFixedOption?.id)
        assertEquals(selected.title, state.selectedFixedOption?.title)
        assertEquals(null, state.branchTask)
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

    @Test
    fun `load fixed entry fails when specified option id is missing`() = runTest {
        val repo = RecordingBranchRepository()
        val viewModel = BranchViewModel(repo)

        viewModel.onEvent(BranchEvent.LoadEntry("ep-final", "fixed", "missing-option"))
        runCurrent()

        val state = viewModel.uiState.value
        assertEquals(BranchScreenState.TASK_FAILED, state.screenState)
        assertEquals("指定分支不存在或已失效", state.errorMessage)
        assertEquals(null, state.selectedFixedOption)
    }

    @Test
    fun `failed custom task exposes server fail reason`() = runTest {
        val repo = RecordingBranchRepository(
            polledTask = RecordingBranchRepository.TaskScenario(
                status = BranchTaskStatus.FAILED,
                title = "生成失败",
                failReason = "图片任务失败，请重新生成"
            )
        )
        val viewModel = BranchViewModel(repo)

        viewModel.onEvent(BranchEvent.LoadOptions("ep-final"))
        runCurrent()
        viewModel.onEvent(BranchEvent.CreateCustomTask("如果她没有回头"))
        runCurrent()
        advanceTimeBy(2_000)
        runCurrent()

        val state = viewModel.uiState.value
        assertEquals(BranchScreenState.TASK_FAILED, state.screenState)
        assertEquals("图片任务失败，请重新生成", state.errorMessage)
    }

    private class RecordingBranchRepository(
        private val polledTask: TaskScenario = TaskScenario(
            status = BranchTaskStatus.SUCCESS,
            title = "她没有离开，而是回来了"
        )
    ) : BranchRepository {
        data class TaskScenario(
            val status: BranchTaskStatus,
            val title: String,
            val failReason: String = ""
        )

        val options = listOf(
            BranchOptionModel(
                id = "bo-1",
                title = "甜蜜结局",
                description = "主角收获爱情与事业双丰收",
                resultType = "image_story",
                coverUrl = "",
                generatedPayloadUrl = "https://example.com/fixed-1.json",
                resultHook = "她终于等到了想要的答案。",
                resultStory = "固定分支一的结果正文。",
                storyboardCards = listOf(
                    StoryboardCard(
                        scene = 1,
                        sceneTitle = "分支起点",
                        imageUrl = "https://example.com/fixed-1-scene-1.png",
                        narrationText = "她走进大厅，决定亲口把答案说清楚。",
                        dialogueText = "这次换我来选。",
                        order = 1,
                        endingCard = true
                    )
                )
            ),
            BranchOptionModel(
                id = "bo-2",
                title = "反转结局",
                description = "一个意想不到的结局",
                resultType = "image_story",
                coverUrl = "",
                generatedPayloadUrl = "https://example.com/fixed-2.json",
                resultHook = "她先下手为强。",
                resultStory = "固定分支二的结果正文。",
                storyboardCards = listOf(
                    StoryboardCard(
                        scene = 1,
                        sceneTitle = "分支起点",
                        imageUrl = "https://example.com/fixed-2-scene-1.png",
                        narrationText = "她提前设局，把最危险的一步留给了对手。",
                        dialogueText = "",
                        order = 1,
                        endingCard = true
                    )
                )
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
                status = polledTask.status,
                title = polledTask.title,
                failReason = polledTask.failReason
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
            title: String,
            failReason: String = ""
        ): BranchTaskModel {
            return BranchTaskModel(
                id = id,
                status = status,
                userPrompt = createdTaskPrompt ?: "",
                resultTitle = title,
                resultHook = "三年后，她以新身份重回宴会现场。",
                resultStory = "这是一段用于测试分支结果流转的故事。",
                failReason = failReason,
                storyboard = listOf(
                    StoryboardScene(1, "她回到现场", 5),
                    StoryboardScene(2, "真相被揭开", 8)
                ),
                storyboardCards = listOf(
                    StoryboardCard(
                        scene = 1,
                        sceneTitle = "分支起点",
                        imageUrl = "https://example.com/task-scene-1.png",
                        narrationText = "她回到现场后，先把最危险的一步稳住了。",
                        dialogueText = "这次轮到我开口。",
                        order = 1,
                        endingCard = false
                    ),
                    StoryboardCard(
                        scene = 2,
                        sceneTitle = "结局收口",
                        imageUrl = "https://example.com/task-scene-2.png",
                        narrationText = "真相揭开后，原本的旧结局也被她当场改写。",
                        dialogueText = "",
                        order = 2,
                        endingCard = true
                    )
                ),
                storyboardImages = emptyList(),
                likeCount = 12,
                commentCount = 2
            )
        }
    }
}
