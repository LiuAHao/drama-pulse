package com.dramapulse.app.core.player

import kotlinx.coroutines.flow.StateFlow

interface PlayerController {
    val playbackState: StateFlow<PlaybackUiState>
    fun setIsFinalEpisode(isFinal: Boolean)
    fun attach(mediaUrl: String, startPositionMs: Long = 0L)
    fun play()
    fun pause()
    fun seekTo(positionMs: Long)
    fun release()
    fun setPreloadCandidate(mediaUrl: String?)
}
