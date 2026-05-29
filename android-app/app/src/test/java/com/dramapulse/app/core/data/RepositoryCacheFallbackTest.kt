package com.dramapulse.app.core.data

import com.dramapulse.app.core.model.remote.ApiResponse
import com.dramapulse.app.core.model.remote.BranchCommentDto
import com.dramapulse.app.core.model.remote.BranchLikeRequest
import com.dramapulse.app.core.model.remote.BranchLikeResponse
import com.dramapulse.app.core.model.remote.BranchOptionDto
import com.dramapulse.app.core.model.remote.BranchTaskDto
import com.dramapulse.app.core.model.remote.ContinueWatchingDto
import com.dramapulse.app.core.model.remote.CreateBranchCommentRequest
import com.dramapulse.app.core.model.remote.CreateBranchTaskRequest
import com.dramapulse.app.core.model.remote.CreateDanmakuMessageRequest
import com.dramapulse.app.core.model.remote.CreateInteractionRequest
import com.dramapulse.app.core.model.remote.CreatePlayerCommentRequest
import com.dramapulse.app.core.model.remote.DanmakuMessageDto
import com.dramapulse.app.core.model.remote.DramaDto
import com.dramapulse.app.core.model.remote.DramaListData
import com.dramapulse.app.core.model.remote.EpisodeDto
import com.dramapulse.app.core.model.remote.FavoriteDramaListDto
import com.dramapulse.app.core.model.remote.HighlightDto
import com.dramapulse.app.core.model.remote.HighlightStatsDto
import com.dramapulse.app.core.model.remote.PaginatedData
import com.dramapulse.app.core.model.remote.PlayerCommentDto
import com.dramapulse.app.core.model.remote.UpdateFavoriteRequest
import com.dramapulse.app.core.model.remote.UpdateFavoriteResponse
import com.dramapulse.app.core.model.remote.UpdateUserProfileRequest
import com.dramapulse.app.core.model.remote.UpsertWatchProgressRequest
import com.dramapulse.app.core.model.remote.UserProfileDto
import com.dramapulse.app.core.model.remote.UserProfileStatsDto
import com.dramapulse.app.core.model.remote.WatchProgressDto
import com.dramapulse.app.core.network.DramaPulseApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class RepositoryCacheFallbackTest {

    @Test
    fun `content repository falls back to cached drama list`() = runTest {
        val api = ToggleableDramaPulseApi()
        val repo = ContentRepositoryImpl(api = api, storage = TestPlayerUiStorage())

        val first = repo.getDramas()
        api.failDramaList = true

        val cached = repo.getDramas()

        assertEquals(first.featured.single().title, cached.featured.single().title)
        assertEquals(first.continueWatching?.progressMs, cached.continueWatching?.progressMs)
    }

    @Test
    fun `progress repository falls back to cached progress and keeps local save on write failure`() = runTest {
        val api = ToggleableDramaPulseApi()
        val repo = ProgressRepositoryImpl(
            api = api,
            deviceId = "device-1",
            userId = "user-1",
            storage = TestPlayerUiStorage()
        )

        val first = repo.getWatchProgress()
        assertEquals(4_000L, first.single().progressMs)

        api.failWatchProgressRead = true
        val cached = repo.getWatchProgress()
        assertEquals(4_000L, cached.single().progressMs)

        api.failWatchProgressWrite = true
        repo.saveWatchProgress("ep-1", 12_345L)
        val locallySaved = repo.getWatchProgress()
        assertEquals("drama-1", locallySaved.single().dramaId)
        assertEquals("主打剧", locallySaved.single().dramaTitle)
        assertEquals("ep-1", locallySaved.single().episode.id)
        assertEquals(12_345L, locallySaved.single().progressMs)
    }
}

private class ToggleableDramaPulseApi : DramaPulseApi {
    var failDramaList = false
    var failWatchProgressRead = false
    var failWatchProgressWrite = false
    private var watchProgress = listOf(buildWatchProgressDto(progressMs = 4_000L))

    override suspend fun getDramas(): ApiResponse<DramaListData> {
        if (failDramaList) error("drama list down")
        return ApiResponse(
            data = DramaListData(
                featured = listOf(buildDramaDto()),
                alternatives = emptyList(),
                continueWatching = ContinueWatchingDto(
                    drama = buildDramaDto(),
                    episode = buildEpisodeDto(),
                    progressMs = 4_000L
                )
            )
        )
    }

    override suspend fun getWatchProgress(userId: String): ApiResponse<List<WatchProgressDto>> {
        if (failWatchProgressRead) error("progress down")
        return ApiResponse(data = watchProgress)
    }

    override suspend fun upsertWatchProgress(
        userId: String,
        request: UpsertWatchProgressRequest
    ): ApiResponse<WatchProgressDto> {
        if (failWatchProgressWrite) error("write down")
        val updated = buildWatchProgressDto(progressMs = request.progressMs)
        watchProgress = listOf(updated)
        return ApiResponse(data = updated)
    }

    override suspend fun getEpisodes(dramaId: String): ApiResponse<List<EpisodeDto>> = throw UnsupportedOperationException()
    override suspend fun getEpisodeDetail(episodeId: String): ApiResponse<EpisodeDto> = throw UnsupportedOperationException()
    override suspend fun getHighlights(episodeId: String): ApiResponse<List<HighlightDto>> = throw UnsupportedOperationException()
    override suspend fun createInteraction(request: CreateInteractionRequest): ApiResponse<HighlightStatsDto> = throw UnsupportedOperationException()
    override suspend fun getBranchOptions(episodeId: String): ApiResponse<List<BranchOptionDto>> = throw UnsupportedOperationException()
    override suspend fun createBranchTask(request: CreateBranchTaskRequest): ApiResponse<BranchTaskDto> = throw UnsupportedOperationException()
    override suspend fun getBranchTask(taskId: String): ApiResponse<BranchTaskDto> = throw UnsupportedOperationException()
    override suspend fun likeBranchTask(taskId: String, request: BranchLikeRequest): ApiResponse<BranchLikeResponse> = throw UnsupportedOperationException()
    override suspend fun createBranchComment(taskId: String, request: CreateBranchCommentRequest): ApiResponse<BranchCommentDto> =
        throw UnsupportedOperationException()
    override suspend fun getBranchComments(taskId: String, page: Int, pageSize: Int): ApiResponse<PaginatedData<BranchCommentDto>> =
        throw UnsupportedOperationException()
    override suspend fun getUserBranchTasks(userId: String): ApiResponse<List<BranchTaskDto>> = throw UnsupportedOperationException()
    override suspend fun getUserProfile(userId: String): ApiResponse<UserProfileStatsDto> = throw UnsupportedOperationException()
    override suspend fun updateUserProfile(userId: String, request: UpdateUserProfileRequest): ApiResponse<UserProfileDto> =
        throw UnsupportedOperationException()
    override suspend fun getFavoriteDramaIds(userId: String): ApiResponse<FavoriteDramaListDto> = throw UnsupportedOperationException()
    override suspend fun updateFavoriteDrama(
        userId: String,
        dramaId: String,
        request: UpdateFavoriteRequest
    ): ApiResponse<UpdateFavoriteResponse> = throw UnsupportedOperationException()
    override suspend fun getPlayerComments(episodeId: String): ApiResponse<List<PlayerCommentDto>> = throw UnsupportedOperationException()
    override suspend fun createPlayerComment(episodeId: String, request: CreatePlayerCommentRequest): ApiResponse<PlayerCommentDto> =
        throw UnsupportedOperationException()
    override suspend fun getDanmakuMessages(episodeId: String): ApiResponse<List<DanmakuMessageDto>> = throw UnsupportedOperationException()
    override suspend fun createDanmakuMessage(episodeId: String, request: CreateDanmakuMessageRequest): ApiResponse<DanmakuMessageDto> =
        throw UnsupportedOperationException()
}

private fun buildDramaDto(): DramaDto {
    return DramaDto(
        id = "drama-1",
        title = "主打剧",
        description = "",
        coverPath = "https://example.com/cover.png",
        tagsJson = "[\"反转\"]",
        mainGenre = "都市",
        isFeatured = true
    )
}

private fun buildEpisodeDto(): EpisodeDto {
    return EpisodeDto(
        id = "ep-1",
        dramaId = "drama-1",
        episodeNo = 1,
        title = "第1集",
        videoPath = "https://example.com/ep-1.mp4",
        durationMs = 20_000L,
        summary = "",
        isFinalEpisode = false,
        hasBranch = false
    )
}

private fun buildWatchProgressDto(progressMs: Long): WatchProgressDto {
    return WatchProgressDto(
        id = "wp-1",
        userId = "user-1",
        deviceId = "device-1",
        dramaId = "drama-1",
        episodeId = "ep-1",
        progressMs = progressMs,
        updatedAt = "2026-05-29T00:00:00Z",
        drama = buildDramaDto(),
        episode = buildEpisodeDto()
    )
}
