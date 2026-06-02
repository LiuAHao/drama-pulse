package com.dramapulse.app.core.data

import com.dramapulse.app.core.model.remote.ApiResponse
import com.dramapulse.app.core.model.remote.CreateDanmakuMessageRequest
import com.dramapulse.app.core.model.remote.CreatePlayerCommentRequest
import com.dramapulse.app.core.model.remote.DanmakuMessageDto
import com.dramapulse.app.core.model.remote.DramaListData
import com.dramapulse.app.core.model.remote.DramaDto
import com.dramapulse.app.core.model.remote.EpisodeDto
import com.dramapulse.app.core.model.remote.FavoriteDramaListDto
import com.dramapulse.app.core.model.remote.HighlightDto
import com.dramapulse.app.core.model.remote.PlayerCommentDto
import com.dramapulse.app.core.model.remote.UpdateFavoriteRequest
import com.dramapulse.app.core.model.remote.UpdateFavoriteResponse
import com.dramapulse.app.core.network.DramaPulseApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class RemoteFirstPlayerUiRepositoryTest {

    @Test(expected = IllegalStateException::class)
    fun `comment creation failure does not create a local ghost comment`() = runTest {
        val localCache = PersistentPlayerUiRepository(storage = TestPlayerUiStorage())
        val repo = RemoteFirstPlayerUiRepository(
            api = FailingCreateApi(),
            userId = "user-1",
            deviceId = "device-1",
            localCache = localCache
        )

        try {
            repo.addComment("ep-1", "不会成功")
        } finally {
            assertTrue(localCache.getComments("ep-1").isEmpty())
        }
    }

    @Test(expected = IllegalStateException::class)
    fun `danmaku creation failure does not create a local ghost danmaku`() = runTest {
        val localCache = PersistentPlayerUiRepository(storage = TestPlayerUiStorage())
        val repo = RemoteFirstPlayerUiRepository(
            api = FailingCreateApi(),
            userId = "user-1",
            deviceId = "device-1",
            localCache = localCache
        )

        try {
            repo.addDanmaku("ep-1", "不会成功", triggerPositionMs = 2_000L)
        } finally {
            assertTrue(localCache.getDanmaku("ep-1").isEmpty())
        }
    }

    @Test
    fun `read requests still fall back to local cache`() = runTest {
        val localCache = PersistentPlayerUiRepository(storage = TestPlayerUiStorage())
        localCache.addComment("ep-1", "缓存评论", createdAtEpochMs = 1_000L)
        localCache.addDanmaku("ep-1", "缓存弹幕", triggerPositionMs = 2_000L, createdAtEpochMs = 1_000L)

        val repo = RemoteFirstPlayerUiRepository(
            api = FailingCreateApi(),
            userId = "user-1",
            deviceId = "device-1",
            localCache = localCache
        )

        val comments = repo.getComments("ep-1")
        val danmaku = repo.getDanmaku("ep-1")

        assertEquals("缓存评论", comments.single().content)
        assertEquals("缓存弹幕", danmaku.single().content)
    }

    private class FailingCreateApi : DramaPulseApi {
        override suspend fun getDramas() = throw UnsupportedOperationException()
        override suspend fun getEpisodes(dramaId: String) = throw UnsupportedOperationException()
        override suspend fun getEpisodeDetail(episodeId: String) = throw UnsupportedOperationException()
        override suspend fun getHighlights(episodeId: String) = throw UnsupportedOperationException()
        override suspend fun createInteraction(request: com.dramapulse.app.core.model.remote.CreateInteractionRequest) =
            throw UnsupportedOperationException()
        override suspend fun getBranchOptions(episodeId: String) = throw UnsupportedOperationException()
        override suspend fun createBranchTask(request: com.dramapulse.app.core.model.remote.CreateBranchTaskRequest) =
            throw UnsupportedOperationException()
        override suspend fun getBranchTask(taskId: String) = throw UnsupportedOperationException()
        override suspend fun likeBranchTask(
            taskId: String,
            request: com.dramapulse.app.core.model.remote.BranchLikeRequest
        ) = throw UnsupportedOperationException()
        override suspend fun createBranchComment(
            taskId: String,
            request: com.dramapulse.app.core.model.remote.CreateBranchCommentRequest
        ) = throw UnsupportedOperationException()
        override suspend fun getBranchComments(
            taskId: String,
            page: Int,
            pageSize: Int
        ) = throw UnsupportedOperationException()
        override suspend fun getUserBranchTasks(userId: String) = throw UnsupportedOperationException()
        override suspend fun getWatchProgress(userId: String) = throw UnsupportedOperationException()
        override suspend fun upsertWatchProgress(
            userId: String,
            request: com.dramapulse.app.core.model.remote.UpsertWatchProgressRequest
        ) = throw UnsupportedOperationException()
        override suspend fun getUserProfile(userId: String) = throw UnsupportedOperationException()
        override suspend fun updateUserProfile(
            userId: String,
            request: com.dramapulse.app.core.model.remote.UpdateUserProfileRequest
        ) = throw UnsupportedOperationException()

        override suspend fun getFavoriteDramaIds(userId: String): ApiResponse<FavoriteDramaListDto> {
            return ApiResponse(data = FavoriteDramaListDto(dramaIds = emptyList(), dramas = emptyList()))
        }

        override suspend fun updateFavoriteDrama(
            userId: String,
            dramaId: String,
            request: UpdateFavoriteRequest
        ): ApiResponse<UpdateFavoriteResponse> {
            return ApiResponse(data = UpdateFavoriteResponse(dramaId = dramaId, favorite = request.favorite))
        }

        override suspend fun getPlayerComments(episodeId: String): ApiResponse<List<PlayerCommentDto>> {
            throw IllegalStateException("network down")
        }

        override suspend fun createPlayerComment(
            episodeId: String,
            request: CreatePlayerCommentRequest
        ): ApiResponse<PlayerCommentDto> {
            throw IllegalStateException("server rejected comment")
        }

        override suspend fun getDanmakuMessages(episodeId: String): ApiResponse<List<DanmakuMessageDto>> {
            throw IllegalStateException("network down")
        }

        override suspend fun createDanmakuMessage(
            episodeId: String,
            request: CreateDanmakuMessageRequest
        ): ApiResponse<DanmakuMessageDto> {
            throw IllegalStateException("server rejected danmaku")
        }

        override suspend fun createDanmakuHeatReport(
            request: com.dramapulse.app.core.model.remote.CreateDanmakuHeatReportRequest
        ): ApiResponse<com.dramapulse.app.core.model.remote.DanmakuHeatReportDto> =
            throw UnsupportedOperationException()
    }
}

class TestPlayerUiStorage : PlayerUiStorage {
    private val values = linkedMapOf<String, String>()

    override fun getString(key: String): String? = values[key]

    override fun putString(key: String, value: String) {
        values[key] = value
    }
}
