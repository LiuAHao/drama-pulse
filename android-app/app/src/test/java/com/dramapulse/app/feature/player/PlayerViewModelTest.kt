package com.dramapulse.app.feature.player

import com.dramapulse.app.core.data.ContentRepository
import com.dramapulse.app.core.data.BranchCommentPage
import com.dramapulse.app.core.data.BranchRepository
import com.dramapulse.app.core.data.DramaListResult
import com.dramapulse.app.core.data.InteractionRepository
import com.dramapulse.app.core.data.HighlightHeatReportResult
import com.dramapulse.app.core.data.InMemoryPlayerUiRepository
import com.dramapulse.app.core.data.PlayerCommentEntry
import com.dramapulse.app.core.data.PlayerDanmakuEntry
import com.dramapulse.app.core.data.PlayerUiRepository
import com.dramapulse.app.core.data.ProgressRepository
import com.dramapulse.app.core.data.WatchProgressEntry
import com.dramapulse.app.core.model.BranchCommentModel
import com.dramapulse.app.core.model.BranchOptionModel
import com.dramapulse.app.core.model.BranchTaskModel
import com.dramapulse.app.core.model.BranchTaskStatus
import com.dramapulse.app.core.model.DramaCardModel
import com.dramapulse.app.core.model.EpisodeModel
import com.dramapulse.app.core.model.HighlightModel
import com.dramapulse.app.core.model.HighlightOption
import com.dramapulse.app.core.model.HighlightType
import com.dramapulse.app.core.model.HighlightStatsModel
import com.dramapulse.app.core.player.PlaybackUiState
import com.dramapulse.app.core.player.PlayerController
import com.dramapulse.app.testutil.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class PlayerViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `enter screen restores saved progress for same drama`() = runTest {
        val dramaId = "drama-1"
        val episode1 = buildEpisode(id = "ep-1", dramaId = dramaId, episodeNo = 1)
        val episode2 = buildEpisode(id = "ep-2", dramaId = dramaId, episodeNo = 2)
        val repos = TestPlayerDependencies(
            contentRepository = FakeContentRepositoryForTest(
                episodes = listOf(episode1, episode2),
                episodeDetails = mapOf(episode1.id to episode1, episode2.id to episode2)
            ),
            progressRepository = FakeProgressRepositoryForTest(
                entries = listOf(
                    WatchProgressEntry(
                        dramaId = dramaId,
                        dramaTitle = "主打剧",
                        episode = episode2,
                        progressMs = 8_500L
                    )
                )
            )
        )
        val viewModel = PlayerViewModel(
            contentRepository = repos.contentRepository,
            progressRepository = repos.progressRepository,
            interactionRepository = repos.interactionRepository,
            branchRepository = repos.branchRepository,
            playerUiRepository = repos.playerUiRepository,
            playerController = repos.playerController
        )

        viewModel.onEvent(PlayerEvent.EnterScreen(dramaId = dramaId, episodeId = null))
        runCurrent()

        val state = viewModel.uiState.value
        assertEquals(PlayerScreenState.READY, state.screenState)
        assertEquals("ep-2", state.meta.currentEpisode?.id)
        assertEquals("主打剧", state.meta.dramaTitle)
        assertEquals(8_500L, repos.playerController.lastAttachedStartPositionMs)
        assertEquals("https://example.com/ep-2.mp4", repos.playerController.lastAttachedUrl)
        viewModel.forceClearForTest()
    }

    @Test
    fun `explicit episode id overrides saved progress episode`() = runTest {
        val dramaId = "drama-1"
        val episode1 = buildEpisode(id = "ep-1", dramaId = dramaId, episodeNo = 1)
        val episode2 = buildEpisode(id = "ep-2", dramaId = dramaId, episodeNo = 2)
        val repos = TestPlayerDependencies(
            contentRepository = FakeContentRepositoryForTest(
                episodes = listOf(episode1, episode2),
                episodeDetails = mapOf(episode1.id to episode1, episode2.id to episode2)
            ),
            progressRepository = FakeProgressRepositoryForTest(
                entries = listOf(
                    WatchProgressEntry(
                        dramaId = dramaId,
                        dramaTitle = "主打剧",
                        episode = episode2,
                        progressMs = 8_500L
                    )
                )
            )
        )
        val viewModel = PlayerViewModel(
            contentRepository = repos.contentRepository,
            progressRepository = repos.progressRepository,
            interactionRepository = repos.interactionRepository,
            branchRepository = repos.branchRepository,
            playerUiRepository = repos.playerUiRepository,
            playerController = repos.playerController
        )

        viewModel.onEvent(PlayerEvent.EnterScreen(dramaId = dramaId, episodeId = "ep-1"))
        runCurrent()

        val state = viewModel.uiState.value
        assertEquals("ep-1", state.meta.currentEpisode?.id)
        assertEquals(0L, repos.playerController.lastAttachedStartPositionMs)
        viewModel.forceClearForTest()
    }

    @Test
    fun `preload is triggered for next episode after entering screen`() = runTest {
        val dramaId = "drama-1"
        val episode1 = buildEpisode(id = "ep-1", dramaId = dramaId, episodeNo = 1)
        val episode2 = buildEpisode(id = "ep-2", dramaId = dramaId, episodeNo = 2)
        val episode3 = buildEpisode(id = "ep-3", dramaId = dramaId, episodeNo = 3)
        val repos = TestPlayerDependencies(
            contentRepository = FakeContentRepositoryForTest(
                episodes = listOf(episode1, episode2, episode3),
                episodeDetails = mapOf(
                    episode1.id to episode1,
                    episode2.id to episode2,
                    episode3.id to episode3
                )
            )
        )
        val viewModel = PlayerViewModel(
            contentRepository = repos.contentRepository,
            progressRepository = repos.progressRepository,
            interactionRepository = repos.interactionRepository,
            branchRepository = repos.branchRepository,
            playerUiRepository = repos.playerUiRepository,
            playerController = repos.playerController
        )

        viewModel.onEvent(PlayerEvent.EnterScreen(dramaId = dramaId, episodeId = "ep-1"))
        runCurrent()

        // Entering ep-1 should preload ep-2
        assertEquals("https://example.com/ep-2.mp4", repos.playerController.preloadedUrl)
        viewModel.forceClearForTest()
    }

    @Test
    fun `preload is null for last episode`() = runTest {
        val dramaId = "drama-1"
        val episode1 = buildEpisode(id = "ep-1", dramaId = dramaId, episodeNo = 1)
        val episode2 = buildEpisode(id = "ep-2", dramaId = dramaId, episodeNo = 2)
        val repos = TestPlayerDependencies(
            contentRepository = FakeContentRepositoryForTest(
                episodes = listOf(episode1, episode2),
                episodeDetails = mapOf(episode1.id to episode1, episode2.id to episode2)
            )
        )
        val viewModel = PlayerViewModel(
            contentRepository = repos.contentRepository,
            progressRepository = repos.progressRepository,
            interactionRepository = repos.interactionRepository,
            branchRepository = repos.branchRepository,
            playerUiRepository = repos.playerUiRepository,
            playerController = repos.playerController
        )

        viewModel.onEvent(PlayerEvent.EnterScreen(dramaId = dramaId, episodeId = "ep-2"))
        runCurrent()

        // Last episode: preload candidate should be null
        assertNull(repos.playerController.preloadedUrl)
        viewModel.forceClearForTest()
    }

    @Test
    fun `episode detail failure sets error state`() = runTest {
        val dramaId = "drama-1"
        val episode1 = buildEpisode(id = "ep-1", dramaId = dramaId, episodeNo = 1)
        val repos = TestPlayerDependencies(
            contentRepository = FakeContentRepositoryForTest(
                episodes = listOf(episode1),
                episodeDetails = emptyMap() // no detail available -> will throw
            )
        )
        val viewModel = PlayerViewModel(
            contentRepository = repos.contentRepository,
            progressRepository = repos.progressRepository,
            interactionRepository = repos.interactionRepository,
            branchRepository = repos.branchRepository,
            playerUiRepository = repos.playerUiRepository,
            playerController = repos.playerController
        )

        viewModel.onEvent(PlayerEvent.EnterScreen(dramaId = dramaId, episodeId = "ep-1"))
        runCurrent()

        val state = viewModel.uiState.value
        assertEquals(PlayerScreenState.ERROR, state.screenState)
        viewModel.forceClearForTest()
    }

    @Test
    fun `paused playback stays paused after leaving and re-entering same episode`() = runTest {
        val dramaId = "drama-1"
        val episode1 = buildEpisode(id = "ep-1", dramaId = dramaId, episodeNo = 1)
        val repos = TestPlayerDependencies(
            contentRepository = FakeContentRepositoryForTest(
                episodes = listOf(episode1),
                episodeDetails = mapOf(episode1.id to episode1)
            )
        )
        val viewModel = PlayerViewModel(
            contentRepository = repos.contentRepository,
            progressRepository = repos.progressRepository,
            interactionRepository = repos.interactionRepository,
            branchRepository = repos.branchRepository,
            playerUiRepository = repos.playerUiRepository,
            playerController = repos.playerController
        )

        viewModel.onEvent(PlayerEvent.EnterScreen(dramaId = dramaId, episodeId = "ep-1"))
        runCurrent()
        repos.playerController.resetPlaybackCalls()

        viewModel.onEvent(PlayerEvent.Pause)
        viewModel.onLeavePlaybackSurface()
        viewModel.onEvent(PlayerEvent.EnterScreen(dramaId = dramaId, episodeId = "ep-1"))
        runCurrent()

        assertEquals(0, repos.playerController.playInvocations)
        assertTrue(repos.playerController.pauseInvocations >= 1)
        viewModel.forceClearForTest()
    }

    @Test
    fun `highlight appears at interactionAppearMs and is interactable at interactionStartMs`() = runTest {
        val dramaId = "drama-1"
        val episode1 = buildEpisode(id = "ep-1", dramaId = dramaId, episodeNo = 1)
        val highlight = buildHighlight(
            id = "hl-1",
            episodeId = episode1.id,
            interactionAppearMs = 15_600,
            interactionStartMs = 16_000,
            interactionEndMs = 19_500
        )
        val repos = TestPlayerDependencies(
            contentRepository = FakeContentRepositoryForTest(
                episodes = listOf(episode1),
                episodeDetails = mapOf(episode1.id to episode1),
                highlightsByEpisodeId = mapOf(episode1.id to listOf(highlight))
            )
        )
        val viewModel = PlayerViewModel(
            contentRepository = repos.contentRepository,
            progressRepository = repos.progressRepository,
            interactionRepository = repos.interactionRepository,
            branchRepository = repos.branchRepository,
            playerUiRepository = repos.playerUiRepository,
            playerController = repos.playerController
        )

        try {
            viewModel.onEvent(PlayerEvent.EnterScreen(dramaId = dramaId, episodeId = episode1.id))
            runCurrent()

            repos.playerController.emitPlayback(positionMs = 15_700)
            advanceTimeBy(600)
            runCurrent()
            assertEquals("hl-1", viewModel.uiState.value.highlight.activeHighlight?.id)
            assertEquals(false, viewModel.uiState.value.highlight.activeInteractionEnabled)

            repos.playerController.emitPlayback(positionMs = 16_100)
            advanceTimeBy(600)
            runCurrent()
            assertEquals(true, viewModel.uiState.value.highlight.activeInteractionEnabled)
        } finally {
            viewModel.forceClearForTest()
        }
    }

    @Test
    fun `strong highlight close to previous strong one is downgraded to quick prompt`() = runTest {
        val dramaId = "drama-1"
        val episode1 = buildEpisode(id = "ep-1", dramaId = dramaId, episodeNo = 1)
        val first = buildHighlight(
            id = "hl-1",
            episodeId = episode1.id,
            interactionAppearMs = 10_000,
            interactionStartMs = 10_200,
            interactionEndMs = 13_500,
            intensity = 5
        )
        val second = buildHighlight(
            id = "hl-2",
            episodeId = episode1.id,
            interactionAppearMs = 15_500,
            interactionStartMs = 15_800,
            interactionEndMs = 18_500,
            intensity = 4,
            type = HighlightType.CONFLICT
        )
        val repos = TestPlayerDependencies(
            contentRepository = FakeContentRepositoryForTest(
                episodes = listOf(episode1),
                episodeDetails = mapOf(episode1.id to episode1),
                highlightsByEpisodeId = mapOf(episode1.id to listOf(first, second))
            )
        )
        val viewModel = PlayerViewModel(
            contentRepository = repos.contentRepository,
            progressRepository = repos.progressRepository,
            interactionRepository = repos.interactionRepository,
            branchRepository = repos.branchRepository,
            playerUiRepository = repos.playerUiRepository,
            playerController = repos.playerController
        )

        try {
            viewModel.onEvent(PlayerEvent.EnterScreen(dramaId = dramaId, episodeId = episode1.id))
            runCurrent()

            repos.playerController.emitPlayback(positionMs = 10_500)
            advanceTimeBy(600)
            runCurrent()
            repos.playerController.emitPlayback(positionMs = 14_000, isPlaying = false)
            advanceTimeBy(600)
            runCurrent()
            repos.playerController.emitPlayback(positionMs = 15_900)
            advanceTimeBy(600)
            runCurrent()

            assertEquals(2, viewModel.uiState.value.highlight.activeHighlight?.intensity)
            assertEquals(true, viewModel.uiState.value.highlight.activeHighlight?.isQuickPrompt)
        } finally {
            viewModel.forceClearForTest()
        }
    }

    @Test
    fun `reset highlight triggers allows same episode to trigger again after re-enter`() = runTest {
        val dramaId = "drama-1"
        val episode1 = buildEpisode(id = "ep-1", dramaId = dramaId, episodeNo = 1)
        val highlight = buildHighlight(
            id = "hl-1",
            episodeId = episode1.id,
            interactionAppearMs = 15_600,
            interactionStartMs = 16_000,
            interactionEndMs = 19_500
        )
        val repos = TestPlayerDependencies(
            contentRepository = FakeContentRepositoryForTest(
                episodes = listOf(episode1),
                episodeDetails = mapOf(episode1.id to episode1),
                highlightsByEpisodeId = mapOf(episode1.id to listOf(highlight))
            )
        )
        val viewModel = PlayerViewModel(
            contentRepository = repos.contentRepository,
            progressRepository = repos.progressRepository,
            interactionRepository = repos.interactionRepository,
            branchRepository = repos.branchRepository,
            playerUiRepository = repos.playerUiRepository,
            playerController = repos.playerController
        )

        try {
            viewModel.onEvent(PlayerEvent.EnterScreen(dramaId = dramaId, episodeId = episode1.id))
            runCurrent()

            repos.playerController.emitPlayback(positionMs = 15_700)
            advanceTimeBy(600)
            runCurrent()
            assertEquals("hl-1", viewModel.uiState.value.highlight.activeHighlight?.id)

            repos.playerController.emitPlayback(positionMs = 20_000)
            advanceTimeBy(600)
            runCurrent()
            assertEquals(true, "hl-1" in viewModel.uiState.value.highlight.triggeredHighlightIds)

            viewModel.resetHighlightTriggersForCurrentEpisode()
            assertTrue(viewModel.uiState.value.highlight.triggeredHighlightIds.isEmpty())
            assertNull(viewModel.uiState.value.highlight.activeHighlight)

            repos.playerController.emitPlayback(positionMs = 15_700)
            advanceTimeBy(600)
            runCurrent()
            assertEquals("hl-1", viewModel.uiState.value.highlight.activeHighlight?.id)
        } finally {
            viewModel.forceClearForTest()
        }
    }

    @Test
    fun `interaction submission updates active highlight stats for heat overlay`() = runTest {
        val dramaId = "drama-1"
        val episode1 = buildEpisode(id = "ep-1", dramaId = dramaId, episodeNo = 1)
        val highlight = buildHighlight(
            id = "hl-1",
            episodeId = episode1.id,
            interactionAppearMs = 1_000,
            interactionStartMs = 1_000,
            interactionEndMs = 6_000
        )
        val repos = TestPlayerDependencies(
            contentRepository = FakeContentRepositoryForTest(
                episodes = listOf(episode1),
                episodeDetails = mapOf(episode1.id to episode1),
                highlightsByEpisodeId = mapOf(episode1.id to listOf(highlight))
            )
        )
        val viewModel = PlayerViewModel(
            contentRepository = repos.contentRepository,
            progressRepository = repos.progressRepository,
            interactionRepository = repos.interactionRepository,
            branchRepository = repos.branchRepository,
            playerUiRepository = repos.playerUiRepository,
            playerController = repos.playerController
        )

        try {
            viewModel.onEvent(PlayerEvent.EnterScreen(dramaId = dramaId, episodeId = episode1.id))
            runCurrent()
            repos.playerController.emitPlayback(positionMs = 1_200L)
            advanceTimeBy(600)
            runCurrent()

            viewModel.onEvent(PlayerEvent.OnInteractionClick("hl-1", "爽了"))
            runCurrent()

            val activeHighlight = viewModel.uiState.value.highlight.activeHighlight
            assertEquals(1, activeHighlight?.stats?.heatLevel)
            assertEquals("爽了", activeHighlight?.stats?.topOption)
        } finally {
            viewModel.forceClearForTest()
        }
    }

    @Test
    fun `comment send failure exposes transient feedback`() = runTest {
        val dramaId = "drama-1"
        val episode1 = buildEpisode(id = "ep-1", dramaId = dramaId, episodeNo = 1)
        val repos = TestPlayerDependencies(
            contentRepository = FakeContentRepositoryForTest(
                episodes = listOf(episode1),
                episodeDetails = mapOf(episode1.id to episode1)
            ),
            playerUiRepository = FailingPlayerUiRepository()
        )
        val viewModel = PlayerViewModel(
            contentRepository = repos.contentRepository,
            progressRepository = repos.progressRepository,
            interactionRepository = repos.interactionRepository,
            branchRepository = repos.branchRepository,
            playerUiRepository = repos.playerUiRepository,
            playerController = repos.playerController
        )

        try {
            viewModel.onEvent(PlayerEvent.EnterScreen(dramaId = dramaId, episodeId = episode1.id))
            runCurrent()

            viewModel.onEvent(PlayerEvent.SubmitComment("发不出去"))
            runCurrent()

            assertEquals("评论发送失败", viewModel.uiState.value.transientMessage?.text)
        } finally {
            viewModel.forceClearForTest()
        }
    }

    @Test
    fun `danmaku send failure exposes transient feedback`() = runTest {
        val dramaId = "drama-1"
        val episode1 = buildEpisode(id = "ep-1", dramaId = dramaId, episodeNo = 1)
        val repos = TestPlayerDependencies(
            contentRepository = FakeContentRepositoryForTest(
                episodes = listOf(episode1),
                episodeDetails = mapOf(episode1.id to episode1)
            ),
            playerUiRepository = FailingPlayerUiRepository()
        )
        val viewModel = PlayerViewModel(
            contentRepository = repos.contentRepository,
            progressRepository = repos.progressRepository,
            interactionRepository = repos.interactionRepository,
            branchRepository = repos.branchRepository,
            playerUiRepository = repos.playerUiRepository,
            playerController = repos.playerController
        )

        try {
            viewModel.onEvent(PlayerEvent.EnterScreen(dramaId = dramaId, episodeId = episode1.id))
            runCurrent()

            viewModel.onEvent(PlayerEvent.SubmitDanmaku("发不出去"))
            runCurrent()

            assertEquals("弹幕发送失败", viewModel.uiState.value.transientMessage?.text)
        } finally {
            viewModel.forceClearForTest()
        }
    }

    private data class TestPlayerDependencies(
        val contentRepository: FakeContentRepositoryForTest,
        val progressRepository: FakeProgressRepositoryForTest = FakeProgressRepositoryForTest(emptyList()),
        val interactionRepository: InteractionRepository = FakeInteractionRepositoryForTest(),
        val branchRepository: BranchRepository = FakeBranchRepositoryForPlayerTest(),
        val playerUiRepository: PlayerUiRepository = InMemoryPlayerUiRepository(),
        val playerController: RecordingPlayerController = RecordingPlayerController()
    )

    private class FakeBranchRepositoryForPlayerTest : BranchRepository {
        override suspend fun getBranchOptions(episodeId: String): List<BranchOptionModel> = emptyList()

        override suspend fun createBranchTask(episodeId: String, userPrompt: String): BranchTaskModel {
            return BranchTaskModel(
                id = "player-test-task",
                status = BranchTaskStatus.PENDING,
                userPrompt = userPrompt,
                resultTitle = "",
                resultHook = "",
                resultStory = "",
                failReason = "",
                storyboard = emptyList(),
                storyboardImages = emptyList(),
                likeCount = 0,
                commentCount = 0
            )
        }

        override suspend fun getBranchTask(taskId: String): BranchTaskModel {
            return BranchTaskModel(
                id = taskId,
                status = BranchTaskStatus.PENDING,
                userPrompt = "",
                resultTitle = "",
                resultHook = "",
                resultStory = "",
                failReason = "",
                storyboard = emptyList(),
                storyboardImages = emptyList(),
                likeCount = 0,
                commentCount = 0
            )
        }

        override suspend fun likeBranchTask(taskId: String): Int = 0

        override suspend fun createComment(taskId: String, content: String): BranchCommentModel {
            return BranchCommentModel(id = "comment", content = content, createdAt = "")
        }

        override suspend fun getComments(taskId: String, page: Int, pageSize: Int): BranchCommentPage {
            return BranchCommentPage(
                items = emptyList(),
                total = 0,
                page = page,
                totalPages = 0
            )
        }
    }

    private class FakeContentRepositoryForTest(
        private val episodes: List<EpisodeModel>,
        private val episodeDetails: Map<String, EpisodeModel>,
        private val highlightsByEpisodeId: Map<String, List<HighlightModel>> = emptyMap()
    ) : ContentRepository {
        override suspend fun getDramas(): DramaListResult {
            return DramaListResult(
                featured = listOf(
                    DramaCardModel(
                        id = "drama-1",
                        title = "主打剧",
                        description = "",
                        coverUrl = "",
                        mainGenre = "",
                        tags = emptyList(),
                        isFeatured = true
                    )
                ),
                alternatives = emptyList(),
                continueWatching = null
            )
        }

        override suspend fun getEpisodes(dramaId: String): List<EpisodeModel> = episodes

        override suspend fun getEpisodeDetail(episodeId: String): EpisodeModel {
            return requireNotNull(episodeDetails[episodeId])
        }

        override suspend fun getHighlights(episodeId: String): List<HighlightModel> =
            highlightsByEpisodeId[episodeId].orEmpty()
    }

    private class FakeProgressRepositoryForTest(
        private val entries: List<WatchProgressEntry>
    ) : ProgressRepository {
        val savedProgressCalls = mutableListOf<Pair<String, Long>>()

        override suspend fun getWatchProgress(): List<WatchProgressEntry> = entries

        override suspend fun saveWatchProgress(episodeId: String, progressMs: Long) {
            savedProgressCalls += episodeId to progressMs
        }
    }

    private class FakeInteractionRepositoryForTest : InteractionRepository {
        override suspend fun submitInteraction(
            episodeId: String,
            highlightId: String,
            interactionType: String,
            optionText: String
        ): HighlightStatsModel {
            return HighlightStatsModel(
                totalCount = 1,
                uniqueDeviceCount = 1,
                heatLevel = 1,
                topOption = optionText
            )
        }

        override suspend fun reportDanmakuHeat(
            episodeId: String,
            triggerPositionMs: Long,
            sampleContents: List<String>
        ): HighlightHeatReportResult {
            return HighlightHeatReportResult(reportId = "fake-report", status = "ok")
        }
    }

    private class FailingPlayerUiRepository : PlayerUiRepository {
        override suspend fun isFavorite(dramaId: String): Boolean = false
        override suspend fun toggleFavorite(dramaId: String): Boolean = false
        override suspend fun getComments(episodeId: String): List<PlayerCommentEntry> = emptyList()
        override suspend fun addComment(
            episodeId: String,
            content: String,
            createdAtEpochMs: Long
        ): List<PlayerCommentEntry> = throw IllegalStateException("评论发送失败")
        override fun isDanmakuEnabled(episodeId: String): Boolean = true
        override fun setDanmakuEnabled(episodeId: String, enabled: Boolean) = Unit
        override suspend fun getDanmaku(episodeId: String): List<PlayerDanmakuEntry> = emptyList()
        override suspend fun addDanmaku(
            episodeId: String,
            content: String,
            triggerPositionMs: Long,
            lane: Int,
            createdAtEpochMs: Long
        ): List<PlayerDanmakuEntry> = throw IllegalStateException("弹幕发送失败")
    }

    private class RecordingPlayerController : PlayerController {
        private val _playbackState = MutableStateFlow(PlaybackUiState())
        override val playbackState: StateFlow<PlaybackUiState> = _playbackState

        var lastAttachedUrl: String? = null
        var lastAttachedStartPositionMs: Long? = null
        var isFinalEpisode: Boolean = false
        var preloadedUrl: String? = null
        var playInvocations: Int = 0
        var pauseInvocations: Int = 0

        override fun setIsFinalEpisode(isFinal: Boolean) {
            isFinalEpisode = isFinal
        }

        override fun attach(mediaUrl: String, startPositionMs: Long) {
            lastAttachedUrl = mediaUrl
            lastAttachedStartPositionMs = startPositionMs
        }

        override fun play() {
            playInvocations += 1
        }

        override fun pause() {
            pauseInvocations += 1
        }

        override fun seekTo(positionMs: Long) = Unit

        override fun release() = Unit

        override fun setPreloadCandidate(mediaUrl: String?) {
            preloadedUrl = mediaUrl
        }

        fun emitPlayback(positionMs: Long, isPlaying: Boolean = true) {
            _playbackState.value = PlaybackUiState(
                currentPositionMs = positionMs,
                durationMs = 30_000,
                bufferedPositionMs = positionMs + 2_000,
                state = if (isPlaying) com.dramapulse.app.core.player.PlaybackState.PLAYING
                else com.dramapulse.app.core.player.PlaybackState.PAUSED
            )
        }

        fun resetPlaybackCalls() {
            playInvocations = 0
            pauseInvocations = 0
        }
    }

    private fun buildEpisode(
        id: String,
        dramaId: String,
        episodeNo: Int
    ): EpisodeModel {
        return EpisodeModel(
            id = id,
            dramaId = dramaId,
            episodeNo = episodeNo,
            title = "第${episodeNo}集",
            videoUrl = "https://example.com/$id.mp4",
            durationMs = 30_000L,
            summary = "",
            isFinalEpisode = episodeNo == 2,
            hasBranch = episodeNo == 2
        )
    }

    private fun buildHighlight(
        id: String,
        episodeId: String,
        interactionAppearMs: Long,
        interactionStartMs: Long,
        interactionEndMs: Long,
        intensity: Int = 3,
        type: HighlightType = HighlightType.FEEL_GOOD
    ): HighlightModel {
        return HighlightModel(
            id = id,
            episodeId = episodeId,
            startTimeMs = interactionStartMs - 600,
            endTimeMs = interactionEndMs - 1_200,
            interactionStartMs = interactionStartMs,
            interactionAppearMs = interactionAppearMs,
            interactionEndMs = interactionEndMs,
            type = type,
            title = "高光测试",
            description = "",
            intensity = intensity,
            interactionOptions = listOf(
                HighlightOption(text = type.fallbackOptionText())
            ),
            stats = null
        )
    }

    private fun PlayerViewModel.forceClearForTest() {
        val method = PlayerViewModel::class.java.getDeclaredMethod("onCleared")
        method.isAccessible = true
        method.invoke(this)
    }
}
