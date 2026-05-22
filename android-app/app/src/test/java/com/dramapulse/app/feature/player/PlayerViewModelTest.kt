package com.dramapulse.app.feature.player

import com.dramapulse.app.core.data.ContentRepository
import com.dramapulse.app.core.data.DramaListResult
import com.dramapulse.app.core.data.InteractionRepository
import com.dramapulse.app.core.data.ProgressRepository
import com.dramapulse.app.core.data.WatchProgressEntry
import com.dramapulse.app.core.model.DramaCardModel
import com.dramapulse.app.core.model.EpisodeModel
import com.dramapulse.app.core.model.HighlightModel
import com.dramapulse.app.core.model.HighlightStatsModel
import com.dramapulse.app.core.player.PlaybackUiState
import com.dramapulse.app.core.player.PlayerController
import com.dramapulse.app.testutil.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
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
            playerController = repos.playerController
        )

        viewModel.onEvent(PlayerEvent.EnterScreen(dramaId = dramaId, episodeId = null))
        runCurrent()

        val state = viewModel.uiState.value
        assertEquals(PlayerScreenState.READY, state.screenState)
        assertEquals("ep-2", state.meta.currentEpisode?.id)
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
            playerController = repos.playerController
        )

        viewModel.onEvent(PlayerEvent.EnterScreen(dramaId = dramaId, episodeId = "ep-1"))
        runCurrent()

        val state = viewModel.uiState.value
        assertEquals("ep-1", state.meta.currentEpisode?.id)
        assertEquals(0L, repos.playerController.lastAttachedStartPositionMs)
        viewModel.forceClearForTest()
    }

    private data class TestPlayerDependencies(
        val contentRepository: FakeContentRepositoryForTest,
        val progressRepository: FakeProgressRepositoryForTest,
        val interactionRepository: InteractionRepository = FakeInteractionRepositoryForTest(),
        val playerController: RecordingPlayerController = RecordingPlayerController()
    )

    private class FakeContentRepositoryForTest(
        private val episodes: List<EpisodeModel>,
        private val episodeDetails: Map<String, EpisodeModel>
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

        override suspend fun getHighlights(episodeId: String): List<HighlightModel> = emptyList()
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
    }

    private class RecordingPlayerController : PlayerController {
        private val _playbackState = MutableStateFlow(PlaybackUiState())
        override val playbackState: StateFlow<PlaybackUiState> = _playbackState

        var lastAttachedUrl: String? = null
        var lastAttachedStartPositionMs: Long? = null
        var isFinalEpisode: Boolean = false

        override fun setIsFinalEpisode(isFinal: Boolean) {
            isFinalEpisode = isFinal
        }

        override fun attach(mediaUrl: String, startPositionMs: Long) {
            lastAttachedUrl = mediaUrl
            lastAttachedStartPositionMs = startPositionMs
        }

        override fun play() = Unit

        override fun pause() = Unit

        override fun seekTo(positionMs: Long) = Unit

        override fun release() = Unit
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

    private fun PlayerViewModel.forceClearForTest() {
        val method = PlayerViewModel::class.java.getDeclaredMethod("onCleared")
        method.isAccessible = true
        method.invoke(this)
    }
}
