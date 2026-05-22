package com.dramapulse.app.feature.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dramapulse.app.core.model.DramaCardModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

enum class ProfileSection {
    HISTORY, FAVORITES, MY_BRANCHES
}

data class ProfileUiState(
    val screenState: ProfileScreenState = ProfileScreenState.IDLE,
    val nickname: String = "剧迷用户",
    val avatarUrl: String? = null,
    val watchCount: Int = 0,
    val favoriteCount: Int = 0,
    val branchCount: Int = 0,
    val selectedSection: ProfileSection = ProfileSection.HISTORY,
    val dramas: List<DramaCardModel> = emptyList(),
    val errorMessage: String? = null
)

enum class ProfileScreenState {
    IDLE, LOADING, CONTENT, EMPTY, ERROR
}

sealed class ProfileEvent {
    data object OnEnter : ProfileEvent()
    data class OnSectionSelected(val section: ProfileSection) : ProfileEvent()
    data class OnDramaClick(val dramaId: String) : ProfileEvent()
}

class ProfileViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    fun onEvent(event: ProfileEvent) {
        when (event) {
            is ProfileEvent.OnEnter -> loadProfile()
            is ProfileEvent.OnSectionSelected -> {
                _uiState.value = _uiState.value.copy(selectedSection = event.section)
                loadSectionData(event.section)
            }
            is ProfileEvent.OnDramaClick -> {}
        }
    }

    private fun loadProfile() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(screenState = ProfileScreenState.LOADING)
            try {
                _uiState.value = _uiState.value.copy(
                    screenState = ProfileScreenState.CONTENT,
                    nickname = "剧迷用户26667294",
                    watchCount = 3,
                    favoriteCount = 2,
                    branchCount = 1,
                    selectedSection = ProfileSection.HISTORY,
                    dramas = demoHistoryDramas
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    screenState = ProfileScreenState.ERROR,
                    errorMessage = e.message ?: "加载失败"
                )
            }
        }
    }

    private fun loadSectionData(section: ProfileSection) {
        val dramas = when (section) {
            ProfileSection.HISTORY -> demoHistoryDramas
            ProfileSection.FAVORITES -> demoFavoriteDramas
            ProfileSection.MY_BRANCHES -> demoBranchDramas
        }
        _uiState.value = _uiState.value.copy(
            screenState = if (dramas.isEmpty()) ProfileScreenState.EMPTY else ProfileScreenState.CONTENT,
            dramas = dramas
        )
    }

    private val demoHistoryDramas = listOf(
        DramaCardModel(
            id = "drama-1",
            title = "荒年全村啃树皮，我有系统满仓肉",
            description = "荒年逆袭与生存反击并行的高热短剧",
            coverUrl = "",
            mainGenre = "逆袭",
            tags = listOf("观看到第2集"),
            isFeatured = true,
            heat = 3935
        ),
        DramaCardModel(
            id = "drama-2",
            title = "撕夜",
            description = "都市情绪拉扯与反转推进并行",
            coverUrl = "",
            mainGenre = "都市",
            tags = listOf("观看到第1集"),
            isFeatured = false,
            heat = 3016
        ),
        DramaCardModel(
            id = "drama-3",
            title = "我真没想重生啊",
            description = "强爽点节奏下的重生系短剧",
            coverUrl = "",
            mainGenre = "爽剧",
            tags = listOf("观看到第1集"),
            isFeatured = false,
            heat = 2784
        )
    )

    private val demoFavoriteDramas = listOf(
        DramaCardModel(
            id = "drama-1",
            title = "荒年全村啃树皮，我有系统满仓肉",
            description = "已收藏主打剧",
            coverUrl = "",
            mainGenre = "逆袭",
            tags = listOf("已收藏"),
            isFeatured = true,
            heat = 3935
        ),
        DramaCardModel(
            id = "drama-2",
            title = "撕夜",
            description = "已收藏备选剧",
            coverUrl = "",
            mainGenre = "都市",
            tags = listOf("已收藏"),
            isFeatured = false,
            heat = 3016
        )
    )

    private val demoBranchDramas = listOf(
        DramaCardModel(
            id = "branch-1",
            title = "荒年尾集分支：全村反击",
            description = "尾集自定义分支结果",
            coverUrl = "",
            mainGenre = "分支",
            tags = listOf("已生成分支"),
            isFeatured = false,
            heat = 0
        )
    )
}
