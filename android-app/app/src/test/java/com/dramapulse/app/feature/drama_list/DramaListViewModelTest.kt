package com.dramapulse.app.feature.drama_list

import com.dramapulse.app.core.data.ContentRepository
import com.dramapulse.app.core.data.DramaListResult
import com.dramapulse.app.core.model.ContinueWatchingModel
import com.dramapulse.app.core.model.DramaCardModel
import com.dramapulse.app.core.model.EpisodeModel
import com.dramapulse.app.testutil.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class DramaListViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `refresh failure keeps previous content instead of switching to error`() = runTest {
        val repo = FlakyContentRepository()
        val viewModel = DramaListViewModel(repo)

        viewModel.onEvent(DramaListEvent.OnEnter)
        runCurrent()
        assertEquals(ScreenState.CONTENT, viewModel.uiState.value.screenState)

        repo.fail = true
        viewModel.onEvent(DramaListEvent.OnRetry)
        runCurrent()

        val state = viewModel.uiState.value
        assertEquals(ScreenState.CONTENT, state.screenState)
        assertEquals("主打剧", state.featured.single().title)
        assertEquals("ep-1", state.continueWatching?.episode?.id)
    }

    private class FlakyContentRepository : ContentRepository {
        var fail = false

        override suspend fun getDramas(): DramaListResult {
            if (fail) error("network down")
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
                continueWatching = ContinueWatchingModel(
                    drama = DramaCardModel(
                        id = "drama-1",
                        title = "主打剧",
                        description = "",
                        coverUrl = "",
                        mainGenre = "",
                        tags = emptyList(),
                        isFeatured = true
                    ),
                    episode = EpisodeModel(
                        id = "ep-1",
                        dramaId = "drama-1",
                        episodeNo = 1,
                        title = "第1集",
                        videoUrl = "",
                        durationMs = 10_000L,
                        summary = "",
                        isFinalEpisode = false,
                        hasBranch = false
                    ),
                    progressMs = 2_000L
                )
            )
        }

        override suspend fun getEpisodes(dramaId: String) = error("unused")
        override suspend fun getEpisodeDetail(episodeId: String) = error("unused")
        override suspend fun getHighlights(episodeId: String) = emptyList<com.dramapulse.app.core.model.HighlightModel>()
    }
}
