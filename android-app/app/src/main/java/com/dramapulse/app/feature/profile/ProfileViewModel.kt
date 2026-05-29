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
    val bio: String = "",
    val avatarUrl: String? = null,
    val watchCount: Int = 0,
    val favoriteCount: Int = 0,
    val branchCount: Int = 0,
    val selectedSection: ProfileSection = ProfileSection.HISTORY,
    val serverBaseUrl: String = "",
    val isEditingProfile: Boolean = false,
    val profileNicknameInput: String = "",
    val profileBioInput: String = "",
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
    data object OnRefresh : ProfileEvent()
    data class OnSectionSelected(val section: ProfileSection) : ProfileEvent()
    data class OnDramaClick(val dramaId: String) : ProfileEvent()
    data object OnEditProfileClick : ProfileEvent()
    data object OnDismissProfileDialog : ProfileEvent()
    data class OnProfileNicknameChanged(val value: String) : ProfileEvent()
    data class OnProfileBioChanged(val value: String) : ProfileEvent()
    data object OnSaveProfile : ProfileEvent()
    data object OnEditServerUrlClick : ProfileEvent()
    data object OnDismissServerUrlDialog : ProfileEvent()
    data class OnServerUrlInputChanged(val value: String) : ProfileEvent()
    data object OnSaveServerUrl : ProfileEvent()
    data class OnDebugHighlightTypeSelected(val type: HighlightType) : ProfileEvent()
    data class OnDebugHighlightIntensitySelected(val intensity: Int) : ProfileEvent()
}

class ProfileViewModel(
    private val serverSettingsRepository: ServerSettingsRepository,
    private val profileRemoteRepository: ProfileRemoteRepository,
    private val profileSettingsRepository: ProfileSettingsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()
    private var sectionData = ProfileSectionData()

    fun onEvent(event: ProfileEvent) {
        when (event) {
            is ProfileEvent.OnEnter -> {
                if (_uiState.value.screenState == ProfileScreenState.IDLE) {
                    loadProfile()
                }
            }
            is ProfileEvent.OnRefresh -> {
                if (_uiState.value.screenState != ProfileScreenState.LOADING) {
                    loadProfile()
                }
            }
            is ProfileEvent.OnSectionSelected -> {
                _uiState.value = _uiState.value.copy(selectedSection = event.section)
                loadSectionData(event.section)
            }
            is ProfileEvent.OnDramaClick -> {}
            is ProfileEvent.OnEditProfileClick -> {
                _uiState.value = _uiState.value.copy(
                    isEditingProfile = true,
                    profileNicknameInput = _uiState.value.nickname,
                    profileBioInput = _uiState.value.bio
                )
            }
            is ProfileEvent.OnDismissProfileDialog -> {
                _uiState.value = _uiState.value.copy(
                    isEditingProfile = false,
                    profileNicknameInput = _uiState.value.nickname,
                    profileBioInput = _uiState.value.bio
                )
            }
            is ProfileEvent.OnProfileNicknameChanged -> {
                _uiState.value = _uiState.value.copy(profileNicknameInput = event.value)
            }
            is ProfileEvent.OnProfileBioChanged -> {
                _uiState.value = _uiState.value.copy(profileBioInput = event.value)
            }
            is ProfileEvent.OnSaveProfile -> {
                saveProfile()
            }
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
            val previousState = _uiState.value
            val selectedSection = _uiState.value.selectedSection
            _uiState.value = _uiState.value.copy(
                screenState = ProfileScreenState.LOADING,
                errorMessage = null
            )
            val cachedNickname = profileSettingsRepository.getNickname()
            val cachedBio = profileSettingsRepository.getBio()
            val cachedAvatarUrl = profileSettingsRepository.getAvatarUrl()
            val serverBaseUrl = serverSettingsRepository.getServerBaseUrl()
            val cachedSectionDramas = sectionDataFor(selectedSection)

            _uiState.value = _uiState.value.copy(
                screenState = deriveScreenState(cachedSectionDramas),
                nickname = cachedNickname,
                bio = cachedBio,
                avatarUrl = cachedAvatarUrl,
                watchCount = previousState.watchCount,
                favoriteCount = previousState.favoriteCount,
                branchCount = previousState.branchCount,
                selectedSection = selectedSection,
                serverBaseUrl = serverBaseUrl,
                serverUrlInput = serverBaseUrl,
                profileNicknameInput = cachedNickname,
                profileBioInput = cachedBio,
                dramas = cachedSectionDramas
            )

            runCatching {
                val remoteProfile = profileRemoteRepository.getProfile()
                val remoteSectionData = profileRemoteRepository.getProfileSectionData()
                remoteProfile to remoteSectionData
            }.onSuccess { (remoteProfile, remoteSectionData) ->
                sectionData = remoteSectionData
                val sectionDramas = sectionDataFor(selectedSection)
                profileSettingsRepository.saveProfile(
                    nickname = remoteProfile.nickname,
                    bio = remoteProfile.bio,
                    avatarUrl = remoteProfile.avatarUrl
                )
                _uiState.value = _uiState.value.copy(
                    nickname = remoteProfile.nickname,
                    bio = remoteProfile.bio,
                    avatarUrl = remoteProfile.avatarUrl,
                    watchCount = remoteProfile.watchCount,
                    favoriteCount = remoteProfile.favoriteCount,
                    branchCount = remoteProfile.branchCount,
                    profileNicknameInput = remoteProfile.nickname,
                    profileBioInput = remoteProfile.bio,
                    screenState = deriveScreenState(sectionDramas),
                    dramas = sectionDramas,
                    errorMessage = null
                )
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    screenState = deriveScreenState(_uiState.value.dramas),
                    errorMessage = error.message ?: "资料加载失败"
                )
            }
        }
    }

    private fun loadSectionData(section: ProfileSection) {
        val sectionDramas = sectionDataFor(section)
        _uiState.value = _uiState.value.copy(
            screenState = deriveScreenState(sectionDramas),
            dramas = sectionDramas
        )
    }

    private fun saveProfile() {
        val nickname = _uiState.value.profileNicknameInput.trim()
        val bio = _uiState.value.profileBioInput.trim()
        val avatarUrl = _uiState.value.avatarUrl

        if (nickname.isBlank()) {
            _uiState.value = _uiState.value.copy(errorMessage = "昵称不能为空")
            return
        }

        viewModelScope.launch {
            runCatching {
                profileRemoteRepository.updateProfile(
                    nickname = nickname,
                    bio = bio,
                    avatarUrl = avatarUrl
                )
            }.onSuccess { remoteProfile ->
                profileSettingsRepository.saveProfile(
                    nickname = remoteProfile.nickname,
                    bio = remoteProfile.bio,
                    avatarUrl = remoteProfile.avatarUrl
                )
                _uiState.value = _uiState.value.copy(
                    nickname = remoteProfile.nickname,
                    bio = remoteProfile.bio,
                    avatarUrl = remoteProfile.avatarUrl,
                    profileNicknameInput = remoteProfile.nickname,
                    profileBioInput = remoteProfile.bio,
                    isEditingProfile = false,
                    errorMessage = null
                )
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    errorMessage = error.message ?: "资料保存失败"
                )
            }
        }
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
        loadProfile()
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
        HighlightType.SWEET -> "暖了一下"
        HighlightType.FUNNY -> "笑点来了"
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
            HighlightOption("心暖了"),
            HighlightOption("被触动了"),
            HighlightOption("护住这一刻")
        )
        HighlightType.FUNNY -> listOf(
            HighlightOption("笑死"),
            HighlightOption("太会了")
        )
    }

    private fun deriveScreenState(dramas: List<DramaCardModel>): ProfileScreenState {
        return if (dramas.isEmpty()) {
            ProfileScreenState.EMPTY
        } else {
            ProfileScreenState.CONTENT
        }
    }

    private fun sectionDataFor(section: ProfileSection): List<DramaCardModel> {
        return when (section) {
            ProfileSection.HISTORY -> sectionData.history
            ProfileSection.FAVORITES -> sectionData.favorites
            ProfileSection.MY_BRANCHES -> sectionData.myBranches
        }
    }

}
