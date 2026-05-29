package com.dramapulse.app.feature.profile

import android.content.Context
import android.content.ContextWrapper
import android.content.SharedPreferences
import com.dramapulse.app.core.model.remote.ApiResponse
import com.dramapulse.app.core.model.remote.BranchCommentDto
import com.dramapulse.app.core.model.remote.BranchLikeRequest
import com.dramapulse.app.core.model.remote.BranchTaskDto
import com.dramapulse.app.core.model.remote.CreateBranchCommentRequest
import com.dramapulse.app.core.model.remote.CreateBranchTaskRequest
import com.dramapulse.app.core.model.remote.CreateDanmakuMessageRequest
import com.dramapulse.app.core.model.remote.CreateInteractionRequest
import com.dramapulse.app.core.model.remote.CreatePlayerCommentRequest
import com.dramapulse.app.core.model.remote.DanmakuMessageDto
import com.dramapulse.app.core.model.remote.FavoriteDramaListDto
import com.dramapulse.app.core.model.remote.PaginatedData
import com.dramapulse.app.core.model.remote.PlayerCommentDto
import com.dramapulse.app.core.model.remote.UpdateFavoriteRequest
import com.dramapulse.app.core.model.remote.UpdateUserProfileRequest
import com.dramapulse.app.core.model.remote.UpsertWatchProgressRequest
import com.dramapulse.app.core.model.remote.UserProfileDto
import com.dramapulse.app.core.model.remote.UserProfileStatsDto
import com.dramapulse.app.core.network.DramaPulseApi
import com.dramapulse.app.core.network.ServerConfigRepository
import com.dramapulse.app.testutil.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ProfileViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `remote profile failure keeps cached profile visible`() = runTest {
        val prefs = InMemorySharedPreferences().apply {
            edit().putString("profile_nickname", "本地昵称").putString("profile_bio", "本地简介").apply()
        }
        val viewModel = ProfileViewModel(
            serverSettingsRepository = ServerSettingsRepository(
                ServerConfigRepository(FakeContext())
            ),
            profileRemoteRepository = ProfileRemoteRepository(
                api = FailingProfileApi(),
                userId = "user-1"
            ),
            profileSettingsRepository = ProfileSettingsRepository(prefs)
        )

        viewModel.onEvent(ProfileEvent.OnEnter)
        runCurrent()

        val state = viewModel.uiState.value
        assertEquals(ProfileScreenState.EMPTY, state.screenState)
        assertEquals("本地昵称", state.nickname)
        assertEquals("本地简介", state.bio)
        assertTrue(state.errorMessage?.contains("资料加载失败") == true)
    }

    @Test
    fun `refresh failure keeps last successful stats`() = runTest {
        val prefs = InMemorySharedPreferences()
        val api = ToggleableProfileApi()
        val viewModel = ProfileViewModel(
            serverSettingsRepository = ServerSettingsRepository(
                ServerConfigRepository(FakeContext())
            ),
            profileRemoteRepository = ProfileRemoteRepository(
                api = api,
                userId = "user-1"
            ),
            profileSettingsRepository = ProfileSettingsRepository(prefs)
        )

        viewModel.onEvent(ProfileEvent.OnEnter)
        runCurrent()
        assertEquals(12, viewModel.uiState.value.watchCount)
        assertEquals(5, viewModel.uiState.value.favoriteCount)
        assertEquals(3, viewModel.uiState.value.branchCount)

        api.failProfile = true
        viewModel.onEvent(ProfileEvent.OnRefresh)
        runCurrent()

        val state = viewModel.uiState.value
        assertEquals(12, state.watchCount)
        assertEquals(5, state.favoriteCount)
        assertEquals(3, state.branchCount)
        assertTrue(state.errorMessage?.contains("资料加载失败") == true)
    }
}

private class FailingProfileApi : DramaPulseApi {
    override suspend fun getUserProfile(userId: String): ApiResponse<UserProfileStatsDto> {
        throw IllegalStateException("资料加载失败")
    }

    override suspend fun getDramas() = throw UnsupportedOperationException()
    override suspend fun getEpisodes(dramaId: String) = throw UnsupportedOperationException()
    override suspend fun getEpisodeDetail(episodeId: String) = throw UnsupportedOperationException()
    override suspend fun getHighlights(episodeId: String) = throw UnsupportedOperationException()
    override suspend fun createInteraction(request: CreateInteractionRequest) = throw UnsupportedOperationException()
    override suspend fun getBranchOptions(episodeId: String) = throw UnsupportedOperationException()
    override suspend fun createBranchTask(request: CreateBranchTaskRequest) = throw UnsupportedOperationException()
    override suspend fun getBranchTask(taskId: String) = throw UnsupportedOperationException()
    override suspend fun likeBranchTask(taskId: String, request: BranchLikeRequest) = throw UnsupportedOperationException()
    override suspend fun createBranchComment(taskId: String, request: CreateBranchCommentRequest) = throw UnsupportedOperationException()
    override suspend fun getBranchComments(taskId: String, page: Int, pageSize: Int): ApiResponse<PaginatedData<BranchCommentDto>> =
        throw UnsupportedOperationException()
    override suspend fun getUserBranchTasks(userId: String): ApiResponse<List<BranchTaskDto>> = throw UnsupportedOperationException()
    override suspend fun getWatchProgress(userId: String) = throw UnsupportedOperationException()
    override suspend fun upsertWatchProgress(userId: String, request: UpsertWatchProgressRequest) = throw UnsupportedOperationException()
    override suspend fun updateUserProfile(userId: String, request: UpdateUserProfileRequest): ApiResponse<UserProfileDto> =
        throw UnsupportedOperationException()
    override suspend fun getFavoriteDramaIds(userId: String): ApiResponse<FavoriteDramaListDto> = throw UnsupportedOperationException()
    override suspend fun updateFavoriteDrama(userId: String, dramaId: String, request: UpdateFavoriteRequest) =
        throw UnsupportedOperationException()
    override suspend fun getPlayerComments(episodeId: String): ApiResponse<List<PlayerCommentDto>> = throw UnsupportedOperationException()
    override suspend fun createPlayerComment(episodeId: String, request: CreatePlayerCommentRequest) =
        throw UnsupportedOperationException()
    override suspend fun getDanmakuMessages(episodeId: String): ApiResponse<List<DanmakuMessageDto>> = throw UnsupportedOperationException()
    override suspend fun createDanmakuMessage(episodeId: String, request: CreateDanmakuMessageRequest) =
        throw UnsupportedOperationException()
}

private class ToggleableProfileApi : DramaPulseApi {
    var failProfile = false

    override suspend fun getUserProfile(userId: String): ApiResponse<UserProfileStatsDto> {
        if (failProfile) throw IllegalStateException("资料加载失败")
        return ApiResponse(
            data = UserProfileStatsDto(
                userId = userId,
                nickname = "远端昵称",
                bio = "远端简介",
                avatarUrl = null,
                watchCount = 12,
                favoriteCount = 5,
                branchCount = 3
            )
        )
    }

    override suspend fun getWatchProgress(userId: String): ApiResponse<List<com.dramapulse.app.core.model.remote.WatchProgressDto>> {
        if (failProfile) throw IllegalStateException("资料加载失败")
        return ApiResponse(data = emptyList())
    }

    override suspend fun getFavoriteDramaIds(userId: String): ApiResponse<FavoriteDramaListDto> {
        if (failProfile) throw IllegalStateException("资料加载失败")
        return ApiResponse(data = FavoriteDramaListDto(dramaIds = emptyList(), dramas = emptyList()))
    }

    override suspend fun getUserBranchTasks(userId: String): ApiResponse<List<BranchTaskDto>> {
        if (failProfile) throw IllegalStateException("资料加载失败")
        return ApiResponse(data = emptyList())
    }

    override suspend fun getDramas() = throw UnsupportedOperationException()
    override suspend fun getEpisodes(dramaId: String) = throw UnsupportedOperationException()
    override suspend fun getEpisodeDetail(episodeId: String) = throw UnsupportedOperationException()
    override suspend fun getHighlights(episodeId: String) = throw UnsupportedOperationException()
    override suspend fun createInteraction(request: CreateInteractionRequest) = throw UnsupportedOperationException()
    override suspend fun getBranchOptions(episodeId: String) = throw UnsupportedOperationException()
    override suspend fun createBranchTask(request: CreateBranchTaskRequest) = throw UnsupportedOperationException()
    override suspend fun getBranchTask(taskId: String) = throw UnsupportedOperationException()
    override suspend fun likeBranchTask(taskId: String, request: BranchLikeRequest) = throw UnsupportedOperationException()
    override suspend fun createBranchComment(taskId: String, request: CreateBranchCommentRequest) = throw UnsupportedOperationException()
    override suspend fun getBranchComments(taskId: String, page: Int, pageSize: Int): ApiResponse<PaginatedData<BranchCommentDto>> =
        throw UnsupportedOperationException()
    override suspend fun upsertWatchProgress(userId: String, request: UpsertWatchProgressRequest) = throw UnsupportedOperationException()
    override suspend fun updateUserProfile(userId: String, request: UpdateUserProfileRequest): ApiResponse<UserProfileDto> =
        throw UnsupportedOperationException()
    override suspend fun updateFavoriteDrama(userId: String, dramaId: String, request: UpdateFavoriteRequest) =
        throw UnsupportedOperationException()
    override suspend fun getPlayerComments(episodeId: String): ApiResponse<List<PlayerCommentDto>> = throw UnsupportedOperationException()
    override suspend fun createPlayerComment(episodeId: String, request: CreatePlayerCommentRequest) =
        throw UnsupportedOperationException()
    override suspend fun getDanmakuMessages(episodeId: String): ApiResponse<List<DanmakuMessageDto>> = throw UnsupportedOperationException()
    override suspend fun createDanmakuMessage(episodeId: String, request: CreateDanmakuMessageRequest) =
        throw UnsupportedOperationException()
}

private class FakeContext : ContextWrapper(null) {
    private val prefs = InMemorySharedPreferences().apply {
        edit().putString("api_base_url", "http://10.0.0.1:8787/").apply()
    }

    override fun getSharedPreferences(name: String?, mode: Int): SharedPreferences = prefs
}

private class InMemorySharedPreferences : SharedPreferences {
    private val values = linkedMapOf<String, String?>()

    override fun getAll(): MutableMap<String, *> = values
    override fun getString(key: String?, defValue: String?): String? = values[key] ?: defValue
    override fun getStringSet(key: String?, defValues: MutableSet<String>?): MutableSet<String>? = defValues
    override fun getInt(key: String?, defValue: Int): Int = defValue
    override fun getLong(key: String?, defValue: Long): Long = defValue
    override fun getFloat(key: String?, defValue: Float): Float = defValue
    override fun getBoolean(key: String?, defValue: Boolean): Boolean = defValue
    override fun contains(key: String?): Boolean = values.containsKey(key)
    override fun edit(): SharedPreferences.Editor = Editor(values)
    override fun registerOnSharedPreferenceChangeListener(listener: SharedPreferences.OnSharedPreferenceChangeListener?) = Unit
    override fun unregisterOnSharedPreferenceChangeListener(listener: SharedPreferences.OnSharedPreferenceChangeListener?) = Unit

    private class Editor(
        private val values: MutableMap<String, String?>
    ) : SharedPreferences.Editor {
        override fun putString(key: String?, value: String?): SharedPreferences.Editor {
            if (key != null) values[key] = value
            return this
        }
        override fun apply() = Unit
        override fun commit(): Boolean = true
        override fun clear(): SharedPreferences.Editor {
            values.clear()
            return this
        }
        override fun remove(key: String?): SharedPreferences.Editor {
            if (key != null) values.remove(key)
            return this
        }
        override fun putLong(key: String?, value: Long): SharedPreferences.Editor = this
        override fun putInt(key: String?, value: Int): SharedPreferences.Editor = this
        override fun putBoolean(key: String?, value: Boolean): SharedPreferences.Editor = this
        override fun putFloat(key: String?, value: Float): SharedPreferences.Editor = this
        override fun putStringSet(key: String?, values: MutableSet<String>?): SharedPreferences.Editor = this
    }
}
