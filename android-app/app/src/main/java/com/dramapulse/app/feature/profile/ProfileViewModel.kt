package com.dramapulse.app.feature.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dramapulse.app.core.model.DramaCardModel
import com.dramapulse.app.core.model.HighlightModel
import com.dramapulse.app.core.model.HighlightOption
import com.dramapulse.app.core.model.HighlightType
import com.dramapulse.app.core.network.isLikelyValidServerBaseUrl
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
    val serverBaseUrl: String = "",
    val isEditingServerUrl: Boolean = false,
    val serverUrlInput: String = "",
    val debugHighlightType: HighlightType = HighlightType.FEEL_GOOD,
    val debugHighlightIntensity: Int = 4,
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
    data object OnEditServerUrlClick : ProfileEvent()
    data object OnDismissServerUrlDialog : ProfileEvent()
    data class OnServerUrlInputChanged(val value: String) : ProfileEvent()
    data object OnSaveServerUrl : ProfileEvent()
    data class OnDebugHighlightTypeSelected(val type: HighlightType) : ProfileEvent()
    data class OnDebugHighlightIntensitySelected(val intensity: Int) : ProfileEvent()
}

class ProfileViewModel(
    private val serverSettingsRepository: ServerSettingsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    fun onEvent(event: ProfileEvent) {
        when (event) {
            is ProfileEvent.OnEnter -> {
                if (_uiState.value.screenState == ProfileScreenState.IDLE) {
                    loadProfile()
                }
            }
            is ProfileEvent.OnSectionSelected -> {
                _uiState.value = _uiState.value.copy(selectedSection = event.section)
                loadSectionData(event.section)
            }
            is ProfileEvent.OnDramaClick -> {}
            is ProfileEvent.OnEditServerUrlClick -> {
                _uiState.value = _uiState.value.copy(
                    isEditingServerUrl = true,
                    serverUrlInput = _uiState.value.serverBaseUrl
                )
            }
            is ProfileEvent.OnDismissServerUrlDialog -> {
                _uiState.value = _uiState.value.copy(
                    isEditingServerUrl = false,
                    serverUrlInput = _uiState.value.serverBaseUrl
                )
            }
            is ProfileEvent.OnServerUrlInputChanged -> {
                _uiState.value = _uiState.value.copy(serverUrlInput = event.value)
            }
            is ProfileEvent.OnSaveServerUrl -> {
                saveServerUrl()
            }
            is ProfileEvent.OnDebugHighlightTypeSelected -> {
                _uiState.value = _uiState.value.copy(debugHighlightType = event.type)
            }
            is ProfileEvent.OnDebugHighlightIntensitySelected -> {
                _uiState.value = _uiState.value.copy(debugHighlightIntensity = event.intensity)
            }
        }
    }

    private fun loadProfile() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(screenState = ProfileScreenState.LOADING)
            try {
                _uiState.value = _uiState.value.copy(
                    screenState = ProfileScreenState.EMPTY,
                    nickname = "剧迷用户26667294",
                    watchCount = 0,
                    favoriteCount = 0,
                    branchCount = 0,
                    selectedSection = ProfileSection.HISTORY,
                    serverBaseUrl = serverSettingsRepository.getServerBaseUrl(),
                    serverUrlInput = serverSettingsRepository.getServerBaseUrl(),
                    dramas = emptyList()
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
        _uiState.value = _uiState.value.copy(
            screenState = ProfileScreenState.EMPTY,
            dramas = emptyList()
        )
    }

    private fun saveServerUrl() {
        val value = _uiState.value.serverUrlInput.trim()
        if (value.isBlank()) {
            _uiState.value = _uiState.value.copy(errorMessage = "服务端地址不能为空")
            return
        }
        if (!value.isLikelyValidServerBaseUrl()) {
            _uiState.value = _uiState.value.copy(
                errorMessage = "地址格式不对，请填写电脑局域网地址，例如 10.208.76.16:8787"
            )
            return
        }
        serverSettingsRepository.saveServerBaseUrl(value)
        _uiState.value = _uiState.value.copy(
            serverBaseUrl = serverSettingsRepository.getServerBaseUrl(),
            serverUrlInput = serverSettingsRepository.getServerBaseUrl(),
            isEditingServerUrl = false,
            errorMessage = null
        )
    }

    fun buildDebugHighlight(): HighlightModel {
        val type = _uiState.value.debugHighlightType
        val intensity = _uiState.value.debugHighlightIntensity
        return HighlightModel(
            id = "debug-${type.value}-$intensity",
            episodeId = "debug-episode",
            startTimeMs = 0L,
            endTimeMs = 8_000L,
            interactionStartMs = 0L,
            interactionAppearMs = 0L,
            interactionEndMs = 8_000L,
            type = type,
            title = debugTitleFor(type),
            description = "用于本地预览高光组件效果",
            intensity = intensity,
            interactionOptions = debugOptionsFor(type),
            stats = null
        )
    }

    private fun debugTitleFor(type: HighlightType): String = when (type) {
        HighlightType.FEEL_GOOD -> "反杀来了"
        HighlightType.REVERSAL -> "突然反转"
        HighlightType.CONFLICT -> "情绪拉满"
        HighlightType.SWEET -> "心动一下"
        HighlightType.FUNNY -> "笑点来了"
        HighlightType.SUSPENSE -> "别眨眼"
        HighlightType.EMOTION_BURST -> "上头瞬间"
    }

    private fun debugOptionsFor(type: HighlightType): List<HighlightOption> = when (type) {
        HighlightType.FEEL_GOOD -> listOf(
            HighlightOption("爽了"),
            HighlightOption("继续打脸"),
            HighlightOption("别停")
        )
        HighlightType.REVERSAL -> listOf(
            HighlightOption("卧槽"),
            HighlightOption("没想到"),
            HighlightOption("居然是他")
        )
        HighlightType.CONFLICT -> listOf(
            HighlightOption("烧起来了"),
            HighlightOption("顶上去"),
            HighlightOption("太炸了")
        )
        HighlightType.SWEET -> listOf(
            HighlightOption("嗑到了"),
            HighlightOption("心动了"),
            HighlightOption("给我亲")
        )
        HighlightType.FUNNY -> listOf(
            HighlightOption("笑死"),
            HighlightOption("太会了")
        )
        HighlightType.SUSPENSE -> listOf(
            HighlightOption("等等"),
            HighlightOption("不对劲")
        )
        HighlightType.EMOTION_BURST -> listOf(
            HighlightOption("上头了"),
            HighlightOption("受不了了")
        )
    }

}
