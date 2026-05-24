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
}
