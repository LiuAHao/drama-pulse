package com.dramapulse.app.feature.drama_list

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dramapulse.app.core.data.ContentRepository
import com.dramapulse.app.core.data.DramaListResult
import com.dramapulse.app.core.model.ContinueWatchingModel
import com.dramapulse.app.core.model.DramaCardModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class DramaListUiState(
    val screenState: ScreenState = ScreenState.IDLE,
    val featured: List<DramaCardModel> = emptyList(),
    val alternatives: List<DramaCardModel> = emptyList(),
    val continueWatching: ContinueWatchingModel? = null,
    val searchQuery: String = "",
    val errorMessage: String? = null
)

enum class ScreenState {
    IDLE, LOADING, CONTENT, EMPTY, ERROR
}

sealed class DramaListEvent {
    data object OnEnter : DramaListEvent()
    data object OnRetry : DramaListEvent()
    data class OnSearchQueryChanged(val query: String) : DramaListEvent()
    data class OnDramaClick(val dramaId: String) : DramaListEvent()
    data object OnContinueWatchingClick : DramaListEvent()
}

class DramaListViewModel(
    private val contentRepository: ContentRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(DramaListUiState())
    val uiState: StateFlow<DramaListUiState> = _uiState.asStateFlow()

    fun onEvent(event: DramaListEvent) {
        when (event) {
            is DramaListEvent.OnEnter -> {
                if (_uiState.value.screenState == ScreenState.IDLE) {
                    loadDramas()
                }
            }
            is DramaListEvent.OnRetry -> loadDramas()
            is DramaListEvent.OnSearchQueryChanged -> {
                _uiState.value = _uiState.value.copy(searchQuery = event.query)
            }
            is DramaListEvent.OnDramaClick -> {}
            is DramaListEvent.OnContinueWatchingClick -> {}
        }
    }

    private fun loadDramas() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(screenState = ScreenState.LOADING)
            try {
                val result = contentRepository.getDramas()
                if (result.featured.isEmpty() && result.alternatives.isEmpty()) {
                    _uiState.value = _uiState.value.copy(
                        screenState = ScreenState.EMPTY,
                        featured = emptyList(),
                        alternatives = emptyList(),
                        continueWatching = result.continueWatching
                    )
                } else {
                    _uiState.value = _uiState.value.copy(
                        screenState = ScreenState.CONTENT,
                        featured = result.featured,
                        alternatives = result.alternatives,
                        continueWatching = result.continueWatching
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    screenState = ScreenState.ERROR,
                    errorMessage = e.message ?: "加载失败"
                )
            }
        }
    }
}
