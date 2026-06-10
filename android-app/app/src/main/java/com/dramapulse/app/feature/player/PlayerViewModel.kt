package com.dramapulse.app.feature.player

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dramapulse.app.core.data.ContentRepository
import com.dramapulse.app.core.data.InteractionRepository
import com.dramapulse.app.core.data.BranchRepository
import com.dramapulse.app.core.data.PlayerCommentEntry
import com.dramapulse.app.core.data.PlayerDanmakuEntry
import com.dramapulse.app.core.data.PlayerUiRepository
import com.dramapulse.app.core.data.ProgressRepository
import com.dramapulse.app.core.model.BranchOptionModel
import com.dramapulse.app.core.model.EpisodeModel
import com.dramapulse.app.core.model.HIGHLIGHT_TEMPLATE_EMOTION_BUTTON
import com.dramapulse.app.core.model.HighlightModel
import com.dramapulse.app.core.model.HighlightDisplayMode
import com.dramapulse.app.core.player.PlaybackState
import com.dramapulse.app.core.player.PlaybackUiState
import com.dramapulse.app.core.player.PlayerController
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
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
    val activeInteractionEnabled: Boolean = false,
    val triggeredHighlightIds: Set<String> = emptySet(),
    val interactionClickCountByHighlightId: Map<String, Int> = emptyMap(),
    val quickPromptConsumedOptionByHighlightId: Map<String, String> = emptyMap()
)

data class OverlayUiState(
    val showEpisodeSelector: Boolean = false,
    val showNextEpisodeCard: Boolean = false,
    val showBranchEntry: Boolean = false,
    val showCommentsSheet: Boolean = false,
    val branchOptions: List<BranchOptionModel> = emptyList()
)

data class DebugPlaybackOverride(
    val highlight: HighlightModel,
    val startPositionMs: Long = 0L
)

data class PlayerSocialUiState(
    val isFavorite: Boolean = false,
    val comments: List<PlayerCommentEntry> = emptyList(),
    val danmakuEnabled: Boolean = true,
    val danmakuMessages: List<PlayerDanmakuEntry> = emptyList(),
    val activeDanmakuMessages: List<PlayerDanmakuEntry> = emptyList()
)

data class PlayerTransientMessage(
    val id: Long = System.currentTimeMillis(),
    val text: String
)

data class PlayerScreenUiState(
    val screenState: PlayerScreenState = PlayerScreenState.IDLE,
    val meta: PlayerMetaState = PlayerMetaState(),
    val playback: PlaybackUiState = PlaybackUiState(),
    val highlight: HighlightUiState = HighlightUiState(),
    val social: PlayerSocialUiState = PlayerSocialUiState(),
    val overlay: OverlayUiState = OverlayUiState(),
    val transientMessage: PlayerTransientMessage? = null,
    val errorMessage: String? = null
)

enum class PlayerScreenState {
    IDLE, LOADING, READY, ERROR
}

sealed class PlayerEvent {
    data class EnterScreen(
        val dramaId: String,
        val episodeId: String?,
        val forceReload: Boolean = false
    ) : PlayerEvent()
    data object Play : PlayerEvent()
    data object Pause : PlayerEvent()
    data class SeekTo(val positionMs: Long) : PlayerEvent()
    data object PlayNextEpisode : PlayerEvent()
    data object PlayPreviousEpisode : PlayerEvent()
    data class SelectEpisode(val index: Int) : PlayerEvent()
    data object ToggleEpisodeSelector : PlayerEvent()
    data object ToggleCommentsSheet : PlayerEvent()
    data object DismissNextEpisode : PlayerEvent()
    data object DismissBranchEntry : PlayerEvent()
    data object ToggleFavorite : PlayerEvent()
    data class SubmitComment(val content: String) : PlayerEvent()
    data class SetDanmakuEnabled(val enabled: Boolean) : PlayerEvent()
    data class SubmitDanmaku(val content: String) : PlayerEvent()
    data class OnInteractionClick(val highlightId: String, val optionText: String) : PlayerEvent()
    data class ConsumeTransientMessage(val id: Long) : PlayerEvent()
    data object GoToBranch : PlayerEvent()
}

class PlayerViewModel(
    private val contentRepository: ContentRepository,
    private val progressRepository: ProgressRepository,
    private val interactionRepository: InteractionRepository,
    private val branchRepository: BranchRepository,
    private val playerUiRepository: PlayerUiRepository,
    private val playerController: PlayerController
) : ViewModel() {

    private val _uiState = MutableStateFlow(PlayerScreenUiState())
    val uiState: StateFlow<PlayerScreenUiState> = _uiState.asStateFlow()

    private var progressSaveJob: Job? = null
    private var highlightCheckJob: Job? = null
    private var activeEpisodeId: String? = null
    private var shouldResumeOnSurfaceReturn: Boolean = false
    private var debugPlaybackOverride: DebugPlaybackOverride? = null
    private val danmakuHeatReportedKeys = mutableSetOf<String>()

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
            is PlayerEvent.EnterScreen -> loadAndPlay(event.dramaId, event.episodeId, event.forceReload)
            is PlayerEvent.Play -> playerController.play()
            is PlayerEvent.Pause -> playerController.pause()
            is PlayerEvent.SeekTo -> playerController.seekTo(event.positionMs)
            is PlayerEvent.PlayNextEpisode -> playNextEpisode()
            is PlayerEvent.PlayPreviousEpisode -> playPreviousEpisode()
            is PlayerEvent.SelectEpisode -> selectEpisode(event.index)
            is PlayerEvent.ToggleEpisodeSelector -> toggleEpisodeSelector()
            is PlayerEvent.ToggleCommentsSheet -> toggleCommentsSheet()
            is PlayerEvent.DismissNextEpisode -> dismissNextEpisode()
            is PlayerEvent.DismissBranchEntry -> dismissBranchEntry()
            is PlayerEvent.ToggleFavorite -> toggleFavorite()
            is PlayerEvent.SubmitComment -> submitComment(event.content)
            is PlayerEvent.SetDanmakuEnabled -> setDanmakuEnabled(event.enabled)
            is PlayerEvent.SubmitDanmaku -> submitDanmaku(event.content)
            is PlayerEvent.OnInteractionClick -> submitInteraction(event.highlightId, event.optionText)
            is PlayerEvent.ConsumeTransientMessage -> consumeTransientMessage(event.id)
            is PlayerEvent.GoToBranch -> {}
        }
    }

    fun setDebugPlaybackOverride(override: DebugPlaybackOverride?) {
        debugPlaybackOverride = override
    }

    fun onLeavePlaybackSurface() {
        shouldResumeOnSurfaceReturn = _uiState.value.playback.isPlaying
        saveProgress()
        playerController.pause()
    }

    private fun loadAndPlay(dramaId: String, episodeId: String?, forceReload: Boolean = false) {
        viewModelScope.launch {
            val currentState = _uiState.value
            val isSameDrama = currentState.meta.dramaId == dramaId
            val isSameEpisode = episodeId == null || currentState.meta.currentEpisode?.id == episodeId
            val debugOverride = debugPlaybackOverride

            // Already showing this drama+episode: just resume
            if (!forceReload && currentState.screenState == PlayerScreenState.READY && isSameDrama && isSameEpisode) {
                if (shouldResumeOnSurfaceReturn) {
                    playerController.play()
                }
                shouldResumeOnSurfaceReturn = false
                return@launch
            }

            // Same drama, different episode: fast switch without full reload
            if (!forceReload && currentState.screenState == PlayerScreenState.READY && isSameDrama && episodeId != null) {
                val targetIndex = currentState.meta.episodes.indexOfFirst { it.id == episodeId }
                if (targetIndex >= 0) {
                    selectEpisode(targetIndex)
                    return@launch
                }
            }

            _uiState.update {
                it.copy(
                    screenState = PlayerScreenState.LOADING,
                    highlight = HighlightUiState(),
                    overlay = OverlayUiState(),
                    errorMessage = null
                )
            }

            try {
                val (episodes, watchProgress, dramaTitle) = coroutineScope {
                    val episodesDeferred = async { contentRepository.getEpisodes(dramaId) }
                    val watchProgressDeferred = async {
                        progressRepository.getWatchProgress().firstOrNull { it.dramaId == dramaId }
                    }
                    val dramaTitleDeferred = async {
                        runCatching {
                            val dramaList = contentRepository.getDramas()
                            dramaList.featured.firstOrNull { it.id == dramaId }?.title
                                ?: dramaList.alternatives.firstOrNull { it.id == dramaId }?.title
                                ?: dramaList.continueWatching?.takeIf { it.drama.id == dramaId }?.drama?.title
                        }.getOrNull().orEmpty()
                    }
                    Triple(episodesDeferred.await(), watchProgressDeferred.await(), dramaTitleDeferred.await())
                }
                if (episodes.isEmpty()) {
                    _uiState.update {
                        it.copy(
                            screenState = PlayerScreenState.ERROR,
                            errorMessage = "暂无剧集"
                        )
                    }
                    return@launch
                }
                val targetIndex = when {
                    episodeId != null -> episodes.indexOfFirst { it.id == episodeId }.coerceAtLeast(0)
                    watchProgress != null -> episodes.indexOfFirst { it.id == watchProgress.episode.id }
                        .takeIf { it >= 0 } ?: 0
                    else -> 0
                }
                val targetEpisode = episodes[targetIndex]
                val resumePositionMs = debugOverride?.startPositionMs ?: if (watchProgress?.episode?.id == targetEpisode.id) {
                    watchProgress.progressMs
                } else {
                    0L
                }

                _uiState.update {
                    it.copy(
                        meta = PlayerMetaState(
                            dramaId = dramaId,
                            dramaTitle = dramaTitle.ifBlank { watchProgress?.dramaTitle.orEmpty() },
                            episodes = episodes,
                            currentEpisode = targetEpisode,
                            currentEpisodeIndex = targetIndex,
                            resumePositionMs = resumePositionMs
                        )
                    )
                }

                activeEpisodeId = targetEpisode.id
                loadEpisodeAnd附属DataParallel(dramaId, targetEpisode.id, resumePositionMs)

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

    private suspend fun loadEpisodeAnd附属DataParallel(
        dramaId: String,
        episodeId: String,
        startPositionMs: Long
    ) {
        coroutineScope {
            val detailDeferred = async {
                contentRepository.getEpisodeDetail(episodeId)
            }
            val highlightsDeferred = async {
                try { contentRepository.getHighlights(episodeId) } catch (_: Exception) { emptyList() }
            }
            val socialDeferred = async {
                PlayerSocialUiState(
                    isFavorite = playerUiRepository.isFavorite(dramaId),
                    comments = playerUiRepository.getComments(episodeId),
                    danmakuEnabled = playerUiRepository.isDanmakuEnabled(episodeId),
                    danmakuMessages = playerUiRepository.getDanmaku(episodeId),
                    activeDanmakuMessages = emptyList()
                )
            }

            // Wait for episode detail first — start the player immediately
            val episode = try {
                detailDeferred.await()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(screenState = PlayerScreenState.ERROR, errorMessage = e.message ?: "加载失败")
                }
                return@coroutineScope
            }

            // Guard: if user already switched to a different episode, skip
            if (activeEpisodeId != episodeId) return@coroutineScope

            _uiState.update {
                it.copy(
                    meta = it.meta.copy(
                        currentEpisode = episode,
                        resumePositionMs = startPositionMs
                    ),
                    screenState = PlayerScreenState.READY
                )
            }
            playerController.setIsFinalEpisode(episode.isFinalEpisode)
            playerController.attach(episode.videoUrl, startPositionMs)

            // Load highlights in background — non-blocking
            val highlights = highlightsDeferred.await()
            if (activeEpisodeId == episodeId) {
                _uiState.update {
                    it.copy(
                        highlight = it.highlight.copy(
                            highlights = debugPlaybackOverride?.let { override ->
                                listOf(override.highlight.copy(episodeId = episodeId))
                            } ?: highlights
                        )
                    )
                }
            }

            val socialState = socialDeferred.await()
            if (activeEpisodeId == episodeId) {
                _uiState.update { it.copy(social = socialState) }
            }
        }

        // Trigger preload for next episode after current is ready
        preloadAdjacentEpisode()
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

    private fun loadSocialState(dramaId: String, episodeId: String) {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    social = PlayerSocialUiState(
                        isFavorite = playerUiRepository.isFavorite(dramaId),
                        comments = playerUiRepository.getComments(episodeId),
                        danmakuEnabled = playerUiRepository.isDanmakuEnabled(episodeId),
                        danmakuMessages = playerUiRepository.getDanmaku(episodeId),
                        activeDanmakuMessages = emptyList()
                    )
                )
            }
        }
    }

    private fun preloadAdjacentEpisode() {
        val meta = _uiState.value.meta
        val nextIndex = meta.currentEpisodeIndex + 1
        val nextEpisode = meta.episodes.getOrNull(nextIndex)
        if (nextEpisode != null) {
            playerController.setPreloadCandidate(nextEpisode.videoUrl)
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
                showBranchEntry()
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

    private fun playPreviousEpisode() {
        val meta = _uiState.value.meta
        val previousIndex = meta.currentEpisodeIndex - 1
        if (previousIndex >= 0) {
            selectEpisode(previousIndex)
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

            activeEpisodeId = episode.id
            loadEpisodeAnd附属DataParallel(meta.dramaId, episode.id, 0L)

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

    private fun toggleCommentsSheet() {
        _uiState.update {
            it.copy(
                overlay = it.overlay.copy(
                    showCommentsSheet = !it.overlay.showCommentsSheet
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
            it.copy(overlay = it.overlay.copy(showBranchEntry = false, branchOptions = emptyList()))
        }
    }

    private fun showBranchEntry() {
        val episodeId = _uiState.value.meta.currentEpisode?.id
        if (episodeId.isNullOrBlank()) {
            _uiState.update {
                it.copy(overlay = it.overlay.copy(showBranchEntry = true, branchOptions = emptyList()))
            }
            return
        }

        viewModelScope.launch {
            val options = runCatching { branchRepository.getBranchOptions(episodeId) }.getOrDefault(emptyList())
            _uiState.update {
                it.copy(
                    overlay = it.overlay.copy(
                        showBranchEntry = true,
                        branchOptions = options.take(2)
                    )
                )
            }
        }
    }

    private fun toggleFavorite() {
        val dramaId = _uiState.value.meta.dramaId.ifBlank { return }
        viewModelScope.launch {
            val isFavorite = playerUiRepository.toggleFavorite(dramaId)
            _uiState.update { it.copy(social = it.social.copy(isFavorite = isFavorite)) }
        }
    }

    private fun submitComment(content: String) {
        val episodeId = _uiState.value.meta.currentEpisode?.id ?: return
        if (content.isBlank()) return
        viewModelScope.launch {
            try {
                val comments = playerUiRepository.addComment(episodeId, content.trim())
                _uiState.update {
                    it.copy(
                        social = it.social.copy(comments = comments),
                        transientMessage = null,
                        errorMessage = null
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        transientMessage = PlayerTransientMessage(text = e.message ?: "评论发送失败")
                    )
                }
            }
        }
    }

    private fun setDanmakuEnabled(enabled: Boolean) {
        val episodeId = _uiState.value.meta.currentEpisode?.id ?: return
        playerUiRepository.setDanmakuEnabled(episodeId, enabled)
        _uiState.update { it.copy(social = it.social.copy(danmakuEnabled = enabled)) }
    }

    private fun submitDanmaku(content: String) {
        val episodeId = _uiState.value.meta.currentEpisode?.id ?: return
        if (content.isBlank()) return
        val currentPositionMs = _uiState.value.playback.currentPositionMs
        viewModelScope.launch {
            try {
                val lane = reserveDanmakuLane(
                    currentPositionMs = currentPositionMs,
                    allMessages = _uiState.value.social.danmakuMessages
                )
                val danmakuMessages = playerUiRepository.addDanmaku(
                    episodeId = episodeId,
                    content = content.trim(),
                    triggerPositionMs = currentPositionMs,
                    lane = lane
                )
                _uiState.update {
                    it.copy(
                        social = it.social.copy(
                            danmakuMessages = danmakuMessages,
                            activeDanmakuMessages = resolveActiveDanmakuMessages(
                                allMessages = danmakuMessages,
                                currentPositionMs = currentPositionMs
                            )
                        ),
                        transientMessage = null,
                        errorMessage = null
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        transientMessage = PlayerTransientMessage(text = e.message ?: "弹幕发送失败")
                    )
                }
            }
        }
    }

    private fun consumeTransientMessage(id: Long) {
        _uiState.update {
            if (it.transientMessage?.id == id) {
                it.copy(transientMessage = null)
            } else {
                it
            }
        }
    }

    private fun submitInteraction(highlightId: String, optionText: String) {
        val meta = _uiState.value.meta
        val episodeId = meta.currentEpisode?.id ?: return
        val highlight = _uiState.value.highlight.activeHighlight?.takeIf { it.id == highlightId }
            ?: _uiState.value.highlight.highlights.firstOrNull { it.id == highlightId }
            ?: return
        val clickCount = _uiState.value.highlight.interactionClickCountByHighlightId[highlightId] ?: 0
        val currentPositionMs = _uiState.value.playback.currentPositionMs

        viewModelScope.launch {
            try {
                val stats = interactionRepository.submitInteraction(
                    episodeId = episodeId,
                    highlightId = highlightId,
                    interactionType = highlight.compatibilityInteractionType(),
                    optionText = optionText
                )
                val updatedHighlights = _uiState.value.highlight.highlights.map { hl ->
                    if (hl.id == highlightId) hl.copy(stats = stats) else hl
                }
                val quickPromptConsumed = if (highlight.isQuickPrompt) {
                    _uiState.value.highlight.quickPromptConsumedOptionByHighlightId + (highlightId to optionText)
                } else {
                    _uiState.value.highlight.quickPromptConsumedOptionByHighlightId
                }
                val updatedDanmakuMessages = if (highlight.isQuickPrompt) {
                    val lane = reserveDanmakuLane(
                        currentPositionMs = currentPositionMs,
                        allMessages = _uiState.value.social.danmakuMessages
                    )
                    playerUiRepository.addDanmaku(
                        episodeId = episodeId,
                        content = optionText,
                        triggerPositionMs = currentPositionMs,
                        lane = lane
                    )
                } else {
                    _uiState.value.social.danmakuMessages
                }
                _uiState.update {
                    it.copy(
                        highlight = it.highlight.copy(
                            highlights = updatedHighlights,
                            activeHighlight = it.highlight.activeHighlight?.let { active ->
                                if (active.id == highlightId) active.copy(stats = stats) else active
                            },
                            activeInteractionEnabled = if (highlight.isQuickPrompt) false else it.highlight.activeInteractionEnabled,
                            triggeredHighlightIds = it.highlight.triggeredHighlightIds + highlightId,
                            interactionClickCountByHighlightId = it.highlight.interactionClickCountByHighlightId +
                                (highlightId to (clickCount + 1)),
                            quickPromptConsumedOptionByHighlightId = quickPromptConsumed
                        ),
                        social = it.social.copy(
                            danmakuMessages = updatedDanmakuMessages,
                            activeDanmakuMessages = resolveActiveDanmakuMessages(
                                allMessages = updatedDanmakuMessages,
                                currentPositionMs = currentPositionMs
                            )
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
        updateActiveDanmaku(playback.currentPositionMs)
        if (playback.state != PlaybackState.PLAYING) return

        val position = playback.currentPositionMs
        val activation = resolveHighlightActivation(state, position)
        if (activation != null) {
            _uiState.update {
                it.copy(
                    highlight = it.highlight.copy(
                        activeHighlight = activation.effectiveHighlight,
                        activeInteractionEnabled = activation.effectiveHighlight.isInteractableAt(position),
                        triggeredHighlightIds = it.highlight.triggeredHighlightIds + activation.sourceHighlight.id
                    )
                )
            }
        }

        val currentActive = _uiState.value.highlight.activeHighlight
        if (currentActive != null) {
            if (!currentActive.isVisibleAt(position)) {
                if (!currentActive.isQuickPrompt) {
                    emitHighlightMultiplierDanmakuIfNeeded(currentActive, position)
                }
                _uiState.update {
                    it.copy(
                        highlight = it.highlight.copy(
                            activeHighlight = null,
                            activeInteractionEnabled = false,
                            quickPromptConsumedOptionByHighlightId = it.highlight.quickPromptConsumedOptionByHighlightId -
                                currentActive.id
                        )
                    )
                }
            } else {
                val quickPromptConsumed = currentActive.isQuickPrompt &&
                    _uiState.value.highlight.quickPromptConsumedOptionByHighlightId.containsKey(currentActive.id)
                val interactable = currentActive.isInteractableAt(position) && !quickPromptConsumed
                if (interactable != _uiState.value.highlight.activeInteractionEnabled) {
                    _uiState.update {
                        it.copy(
                            highlight = it.highlight.copy(
                                activeInteractionEnabled = interactable
                            )
                        )
                    }
                }
            }
        }
    }

    fun resetHighlightTriggersForCurrentEpisode() {
        danmakuHeatReportedKeys.clear()
        _uiState.update {
            it.copy(
                highlight = it.highlight.copy(
                    activeHighlight = null,
                    activeInteractionEnabled = false,
                    triggeredHighlightIds = emptySet(),
                    interactionClickCountByHighlightId = emptyMap(),
                    quickPromptConsumedOptionByHighlightId = emptyMap()
                )
            )
        }
    }

    private fun resolveHighlightActivation(
        state: PlayerScreenUiState,
        positionMs: Long
    ): HighlightActivation? {
        val sourceHighlight = state.highlight.highlights
            .asSequence()
            .filter { highlight ->
                highlight.id !in state.highlight.triggeredHighlightIds &&
                    highlight.isClientDisplayable() &&
                    highlight.isVisibleAt(positionMs)
            }
            .sortedWith(
                compareByDescending<HighlightModel> { it.activationPriorityScore() }
                    .thenByDescending { it.confidence }
                    .thenByDescending { it.interactionAppearMs }
                    .thenBy { it.startTimeMs }
            )
            .firstOrNull() ?: return null

        val shouldDowngradeToQuickPrompt = state.highlight.highlights.any { previous ->
            previous.id in state.highlight.triggeredHighlightIds &&
                previous.id != sourceHighlight.id &&
                previous.intensity >= STRONG_HIGHLIGHT_INTENSITY_THRESHOLD &&
                sourceHighlight.intensity >= STRONG_HIGHLIGHT_INTENSITY_THRESHOLD &&
                sourceHighlight.interactionAppearMs >= previous.interactionEndMs &&
                (sourceHighlight.interactionAppearMs - previous.interactionEndMs) <= STRONG_HIGHLIGHT_FOLLOWUP_DOWNGRADE_WINDOW_MS
        }
        val effectiveHighlight = if (shouldDowngradeToQuickPrompt) {
            sourceHighlight.copy(
                intensity = QUICK_PROMPT_DOWNGRADED_INTENSITY,
                displayMode = HighlightDisplayMode.QUICK_PROMPT,
                resolvedInteractionType = HIGHLIGHT_TEMPLATE_EMOTION_BUTTON,
                soundEnabled = false,
                singleUse = true,
            )
        } else {
            sourceHighlight
        }

        return HighlightActivation(
            sourceHighlight = sourceHighlight,
            effectiveHighlight = effectiveHighlight
        )
    }

    private fun updateActiveDanmaku(currentPositionMs: Long) {
        val social = _uiState.value.social
        if (!social.danmakuEnabled) {
            if (social.activeDanmakuMessages.isNotEmpty()) {
                _uiState.update {
                    it.copy(social = it.social.copy(activeDanmakuMessages = emptyList()))
                }
            }
            return
        }
        val activeMessages = resolveActiveDanmakuMessages(
            allMessages = social.danmakuMessages,
            currentPositionMs = currentPositionMs
        )
        if (activeMessages != social.activeDanmakuMessages) {
            _uiState.update {
                it.copy(social = it.social.copy(activeDanmakuMessages = activeMessages))
            }
        }
        maybeReportDanmakuHeat(currentPositionMs, social.activeDanmakuMessages)
    }

    private fun resolveActiveDanmakuMessages(
        allMessages: List<PlayerDanmakuEntry>,
        currentPositionMs: Long
    ): List<PlayerDanmakuEntry> {
        return allMessages
            .filter { message ->
                val delta = currentPositionMs - message.triggerPositionMs
                delta in 0..DANMAKU_VISIBLE_WINDOW_MS
            }
            .sortedByDescending { it.createdAtEpochMs }
            .take(MAX_ACTIVE_DANMAKU)
    }

    private fun reserveDanmakuLane(
        currentPositionMs: Long,
        allMessages: List<PlayerDanmakuEntry>
    ): Int {
        val busyLanes = allMessages
            .filter { kotlin.math.abs(it.triggerPositionMs - currentPositionMs) < DANMAKU_LANE_COLLISION_WINDOW_MS }
            .map { it.lane }
            .toSet()

        return (0 until DANMAKU_TRACK_COUNT).firstOrNull { it !in busyLanes }
            ?: ((currentPositionMs / 400L).toInt().mod(DANMAKU_TRACK_COUNT))
    }

    private fun emitHighlightMultiplierDanmakuIfNeeded(
        highlight: HighlightModel,
        currentPositionMs: Long
    ) {
        val episodeId = _uiState.value.meta.currentEpisode?.id ?: return
        val clickCount = _uiState.value.highlight.interactionClickCountByHighlightId[highlight.id] ?: 0
        if (clickCount <= 0) return

        viewModelScope.launch {
            runCatching {
                val content = "${highlight.type.fallbackOptionText()}×$clickCount"
                val lane = reserveDanmakuLane(
                    currentPositionMs = currentPositionMs,
                    allMessages = _uiState.value.social.danmakuMessages
                )
                val updated = playerUiRepository.addDanmaku(
                    episodeId = episodeId,
                    content = content,
                    triggerPositionMs = currentPositionMs,
                    lane = lane
                )
                _uiState.update {
                    it.copy(
                        social = it.social.copy(
                            danmakuMessages = updated,
                            activeDanmakuMessages = resolveActiveDanmakuMessages(updated, currentPositionMs)
                        ),
                        highlight = it.highlight.copy(
                            interactionClickCountByHighlightId = it.highlight.interactionClickCountByHighlightId -
                                highlight.id
                        )
                    )
                }
            }
        }
    }

    private fun maybeReportDanmakuHeat(
        currentPositionMs: Long,
        activeMessages: List<PlayerDanmakuEntry>
    ) {
        val episodeId = _uiState.value.meta.currentEpisode?.id ?: return
        val activeHighlight = _uiState.value.highlight.activeHighlight
        if (activeHighlight?.isVisibleAt(currentPositionMs) == true) return
        if (activeMessages.size < DANMAKU_HEAT_REPORT_THRESHOLD) return

        val bucketStartMs = (currentPositionMs / DANMAKU_HEAT_BUCKET_MS) * DANMAKU_HEAT_BUCKET_MS
        val reportKey = "$episodeId:$bucketStartMs"
        if (reportKey in danmakuHeatReportedKeys) return
        danmakuHeatReportedKeys += reportKey

        val sampleContents = activeMessages.take(DANMAKU_HEAT_REPORT_SAMPLE_SIZE).map { it.content }
        viewModelScope.launch {
            runCatching {
                interactionRepository.reportDanmakuHeat(
                    episodeId = episodeId,
                    triggerPositionMs = bucketStartMs,
                    sampleContents = sampleContents
                )
            }
        }
    }

    companion object {
        private const val DANMAKU_VISIBLE_WINDOW_MS = 5_500L
        private const val MAX_ACTIVE_DANMAKU = 6
        private const val DANMAKU_TRACK_COUNT = 6
        private const val DANMAKU_LANE_COLLISION_WINDOW_MS = 2_400L
        private const val DANMAKU_HEAT_REPORT_THRESHOLD = 4
        private const val DANMAKU_HEAT_BUCKET_MS = 6_000L
        private const val DANMAKU_HEAT_REPORT_SAMPLE_SIZE = 5
        private const val STRONG_HIGHLIGHT_INTENSITY_THRESHOLD = 4
        private const val QUICK_PROMPT_DOWNGRADED_INTENSITY = 2
        private const val STRONG_HIGHLIGHT_FOLLOWUP_DOWNGRADE_WINDOW_MS = 3_000L
    }

    private data class HighlightActivation(
        val sourceHighlight: HighlightModel,
        val effectiveHighlight: HighlightModel
    )

    override fun onCleared() {
        super.onCleared()
        saveProgress()
        progressSaveJob?.cancel()
        highlightCheckJob?.cancel()
        playerController.release()
    }
}
