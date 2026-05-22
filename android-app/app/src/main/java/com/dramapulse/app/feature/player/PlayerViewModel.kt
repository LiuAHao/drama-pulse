package com.dramapulse.app.feature.player

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dramapulse.app.core.data.ContentRepository
import com.dramapulse.app.core.data.InteractionRepository
import com.dramapulse.app.core.data.ProgressRepository
import com.dramapulse.app.core.model.EpisodeModel
import com.dramapulse.app.core.model.HighlightModel
import com.dramapulse.app.core.player.PlaybackState
import com.dramapulse.app.core.player.PlaybackUiState
import com.dramapulse.app.core.player.PlayerController
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class PlayerMetaState(
    val dramaId: String = "",
    val dramaTitle: String = "",
    val episodes: List<EpisodeModel> = emptyList(),
    val currentEpisode: EpisodeModel? = null,
    val currentEpisodeIndex: Int = 0,
    val resumePositionMs: Long = 0L
)

data class HighlightUiState(
    val highlights: List<HighlightModel> = emptyList(),
    val activeHighlight: HighlightModel? = null,
    val triggeredHighlightIds: Set<String> = emptySet(),
    val lastStrongHighlightAt: Long = 0
)

data class OverlayUiState(
    val showEpisodeSelector: Boolean = false,
    val showNextEpisodeCard: Boolean = false,
    val showBranchEntry: Boolean = false
)

data class PlayerScreenUiState(
    val screenState: PlayerScreenState = PlayerScreenState.IDLE,
    val meta: PlayerMetaState = PlayerMetaState(),
    val playback: PlaybackUiState = PlaybackUiState(),
    val highlight: HighlightUiState = HighlightUiState(),
    val overlay: OverlayUiState = OverlayUiState(),
    val errorMessage: String? = null
)

enum class PlayerScreenState {
    IDLE, LOADING, READY, ERROR
}

sealed class PlayerEvent {
    data class EnterScreen(val dramaId: String, val episodeId: String?) : PlayerEvent()
    data object Play : PlayerEvent()
    data object Pause : PlayerEvent()
    data class SeekTo(val positionMs: Long) : PlayerEvent()
    data object PlayNextEpisode : PlayerEvent()
    data class SelectEpisode(val index: Int) : PlayerEvent()
    data object ToggleEpisodeSelector : PlayerEvent()
    data object DismissNextEpisode : PlayerEvent()
    data object DismissBranchEntry : PlayerEvent()
    data class OnInteractionClick(val highlightId: String, val optionText: String) : PlayerEvent()
    data object GoToBranch : PlayerEvent()
}

class PlayerViewModel(
    private val contentRepository: ContentRepository,
    private val progressRepository: ProgressRepository,
    private val interactionRepository: InteractionRepository,
    private val playerController: PlayerController
) : ViewModel() {

    private val _uiState = MutableStateFlow(PlayerScreenUiState())
    val uiState: StateFlow<PlayerScreenUiState> = _uiState.asStateFlow()

    private var progressSaveJob: Job? = null
    private var highlightCheckJob: Job? = null

    init {
        viewModelScope.launch {
            playerController.playbackState.collect { playback ->
                _uiState.update { it.copy(playback = playback) }
                handlePlaybackStateChange(playback)
            }
        }
    }

    fun onEvent(event: PlayerEvent) {
        when (event) {
            is PlayerEvent.EnterScreen -> loadAndPlay(event.dramaId, event.episodeId)
            is PlayerEvent.Play -> playerController.play()
            is PlayerEvent.Pause -> playerController.pause()
            is PlayerEvent.SeekTo -> playerController.seekTo(event.positionMs)
            is PlayerEvent.PlayNextEpisode -> playNextEpisode()
            is PlayerEvent.SelectEpisode -> selectEpisode(event.index)
            is PlayerEvent.ToggleEpisodeSelector -> toggleEpisodeSelector()
            is PlayerEvent.DismissNextEpisode -> dismissNextEpisode()
            is PlayerEvent.DismissBranchEntry -> dismissBranchEntry()
            is PlayerEvent.OnInteractionClick -> submitInteraction(event.highlightId, event.optionText)
            is PlayerEvent.GoToBranch -> {}
        }
    }

    fun onLeavePlaybackSurface() {
        saveProgress()
        playerController.pause()
    }

    private fun loadAndPlay(dramaId: String, episodeId: String?) {
        viewModelScope.launch {
            _uiState.update { it.copy(screenState = PlayerScreenState.LOADING) }
            try {
                val episodes = contentRepository.getEpisodes(dramaId)
                if (episodes.isEmpty()) {
                    _uiState.update {
                        it.copy(
                            screenState = PlayerScreenState.ERROR,
                            errorMessage = "暂无剧集"
                        )
                    }
                    return@launch
                }

                val watchProgress = progressRepository.getWatchProgress()
                    .firstOrNull { it.dramaId == dramaId }
                val targetIndex = when {
                    episodeId != null -> episodes.indexOfFirst { it.id == episodeId }.coerceAtLeast(0)
                    watchProgress != null -> episodes.indexOfFirst { it.id == watchProgress.episode.id }
                        .takeIf { it >= 0 } ?: 0
                    else -> 0
                }
                val targetEpisode = episodes[targetIndex]
                val resumePositionMs = if (watchProgress?.episode?.id == targetEpisode.id) {
                    watchProgress.progressMs
                } else {
                    0L
                }

                _uiState.update {
                    it.copy(
                        meta = PlayerMetaState(
                            dramaId = dramaId,
                            dramaTitle = "",
                            episodes = episodes,
                            currentEpisode = targetEpisode,
                            currentEpisodeIndex = targetIndex,
                            resumePositionMs = resumePositionMs
                        )
                    )
                }

                loadEpisodeDetail(targetEpisode.id, resumePositionMs)
                loadHighlights(targetEpisode.id)

                _uiState.update { it.copy(screenState = PlayerScreenState.READY) }

                startProgressAutoSave()
                startHighlightCheck()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        screenState = PlayerScreenState.ERROR,
                        errorMessage = e.message ?: "加载失败"
                    )
                }
            }
        }
    }

    private suspend fun loadEpisodeDetail(episodeId: String, startPositionMs: Long = 0L) {
        try {
            val episode = contentRepository.getEpisodeDetail(episodeId)
            _uiState.update {
                it.copy(
                    meta = it.meta.copy(
                        currentEpisode = episode,
                        dramaTitle = episode.title,
                        resumePositionMs = startPositionMs
                    )
                )
            }
            playerController.setIsFinalEpisode(episode.isFinalEpisode)
            playerController.attach(episode.videoUrl, startPositionMs)
        } catch (_: Exception) {}
    }

    private fun loadHighlights(episodeId: String) {
        viewModelScope.launch {
            try {
                val highlights = contentRepository.getHighlights(episodeId)
                _uiState.update {
                    it.copy(highlight = it.highlight.copy(highlights = highlights))
                }
            } catch (_: Exception) {}
        }
    }

    private fun handlePlaybackStateChange(playback: PlaybackUiState) {
        when (playback.state) {
            PlaybackState.ENDED -> {
                _uiState.update {
                    it.copy(overlay = it.overlay.copy(showNextEpisodeCard = true))
                }
            }
            PlaybackState.BRANCH_READY -> {
                _uiState.update {
                    it.copy(overlay = it.overlay.copy(showBranchEntry = true))
                }
            }
            PlaybackState.ERROR -> {
                _uiState.update {
                    it.copy(errorMessage = playback.errorMessage)
                }
            }
            else -> {}
        }
    }

    private fun playNextEpisode() {
        val meta = _uiState.value.meta
        val nextIndex = meta.currentEpisodeIndex + 1
        if (nextIndex < meta.episodes.size) {
            selectEpisode(nextIndex)
            _uiState.update {
                it.copy(overlay = it.overlay.copy(showNextEpisodeCard = false))
            }
        }
    }

    private fun selectEpisode(index: Int) {
        val meta = _uiState.value.meta
        if (index !in meta.episodes.indices) return

        val episode = meta.episodes[index]
        viewModelScope.launch {
            saveProgress()
            _uiState.update {
                it.copy(
                    meta = it.meta.copy(
                        currentEpisode = episode,
                        currentEpisodeIndex = index,
                        resumePositionMs = 0L
                    ),
                    highlight = HighlightUiState(),
                    overlay = OverlayUiState()
                )
            }

            loadEpisodeDetail(episode.id, 0L)
            loadHighlights(episode.id)

            _uiState.update {
                it.copy(overlay = it.overlay.copy(showEpisodeSelector = false))
            }
        }
    }

    private fun toggleEpisodeSelector() {
        _uiState.update {
            it.copy(
                overlay = it.overlay.copy(
                    showEpisodeSelector = !it.overlay.showEpisodeSelector
                )
            )
        }
    }

    private fun dismissNextEpisode() {
        _uiState.update {
            it.copy(overlay = it.overlay.copy(showNextEpisodeCard = false))
        }
    }

    private fun dismissBranchEntry() {
        _uiState.update {
            it.copy(overlay = it.overlay.copy(showBranchEntry = false))
        }
    }

    private fun submitInteraction(highlightId: String, optionText: String) {
        val meta = _uiState.value.meta
        val episodeId = meta.currentEpisode?.id ?: return

        viewModelScope.launch {
            try {
                val stats = interactionRepository.submitInteraction(
                    episodeId = episodeId,
                    highlightId = highlightId,
                    interactionType = "emotion_button",
                    optionText = optionText
                )
                val updatedHighlights = _uiState.value.highlight.highlights.map { hl ->
                    if (hl.id == highlightId) hl.copy(stats = stats) else hl
                }
                _uiState.update {
                    it.copy(
                        highlight = it.highlight.copy(
                            highlights = updatedHighlights,
                            triggeredHighlightIds = it.highlight.triggeredHighlightIds + highlightId
                        )
                    )
                }
            } catch (_: Exception) {}
        }
    }

    private fun startProgressAutoSave() {
        progressSaveJob?.cancel()
        progressSaveJob = viewModelScope.launch {
            while (true) {
                delay(10_000)
                saveProgress()
            }
        }
    }

    private fun saveProgress() {
        val meta = _uiState.value.meta
        val episode = meta.currentEpisode ?: return
        val position = _uiState.value.playback.currentPositionMs
        if (position <= 0L) return
        viewModelScope.launch {
            try {
                progressRepository.saveWatchProgress(episode.id, position)
            } catch (_: Exception) {}
        }
    }

    private fun startHighlightCheck() {
        highlightCheckJob?.cancel()
        highlightCheckJob = viewModelScope.launch {
            while (true) {
                delay(500)
                checkHighlights()
            }
        }
    }

    private fun checkHighlights() {
        val state = _uiState.value
        val playback = state.playback
        if (playback.state != PlaybackState.PLAYING) return

        val position = playback.currentPositionMs
        val highlights = state.highlight.highlights
        val triggered = state.highlight.triggeredHighlightIds

        for (highlight in highlights) {
            if (highlight.id in triggered) continue
            if (position in highlight.startTimeMs..highlight.endTimeMs) {
                _uiState.update {
                    it.copy(
                        highlight = it.highlight.copy(
                            activeHighlight = highlight,
                            triggeredHighlightIds = triggered + highlight.id
                        )
                    )
                }
                break
            }
        }

        val active = state.highlight.activeHighlight
        if (active != null && (position < active.startTimeMs || position > active.endTimeMs + 3000)) {
            _uiState.update {
                it.copy(highlight = it.highlight.copy(activeHighlight = null))
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        saveProgress()
        progressSaveJob?.cancel()
        highlightCheckJob?.cancel()
        playerController.release()
    }
}
