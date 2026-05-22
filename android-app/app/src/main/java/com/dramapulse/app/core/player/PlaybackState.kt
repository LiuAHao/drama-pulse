package com.dramapulse.app.core.player

enum class PlaybackState {
    IDLE,
    LOADING_META,
    PREPARING_PLAYER,
    READY,
    PLAYING,
    PAUSED,
    SEEKING,
    BUFFERING,
    ERROR,
    ENDED,
    BRANCH_READY
}

data class PlaybackUiState(
    val state: PlaybackState = PlaybackState.IDLE,
    val currentPositionMs: Long = 0,
    val durationMs: Long = 0,
    val bufferedPositionMs: Long = 0,
    val errorMessage: String? = null,
    val isFinalEpisode: Boolean = false
) {
    val progressFraction: Float
        get() = if (durationMs > 0) (currentPositionMs.toFloat() / durationMs).coerceIn(0f, 1f) else 0f

    val bufferedFraction: Float
        get() = if (durationMs > 0) (bufferedPositionMs.toFloat() / durationMs).coerceIn(0f, 1f) else 0f

    val isPlaying: Boolean get() = state == PlaybackState.PLAYING
    val isBuffering: Boolean get() = state == PlaybackState.BUFFERING
    val isEnded: Boolean get() = state == PlaybackState.ENDED || state == PlaybackState.BRANCH_READY
    val canPlay: Boolean get() = state in listOf(PlaybackState.READY, PlaybackState.PAUSED, PlaybackState.ENDED)
    val canPause: Boolean get() = state == PlaybackState.PLAYING
    val hasError: Boolean get() = state == PlaybackState.ERROR
}
