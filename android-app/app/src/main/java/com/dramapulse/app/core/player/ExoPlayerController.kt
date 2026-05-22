package com.dramapulse.app.core.player

import android.content.Context
import android.os.Handler
import android.os.Looper
import androidx.annotation.OptIn
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class ExoPlayerController(
    private val context: Context
) : PlayerController {

    var player: ExoPlayer? = null
        private set
    private val handler = Handler(Looper.getMainLooper())
    private var playerListener: Player.Listener? = null

    private val _playbackState = MutableStateFlow(PlaybackUiState())
    override val playbackState: StateFlow<PlaybackUiState> = _playbackState.asStateFlow()

    private var isFinalEpisode = false

    private val progressRunnable = object : Runnable {
        override fun run() {
            player?.let { p ->
                val current = _playbackState.value
                _playbackState.value = current.copy(
                    currentPositionMs = p.currentPosition,
                    durationMs = p.duration.coerceAtLeast(0),
                    bufferedPositionMs = p.bufferedPosition
                )
            }
            handler.postDelayed(this, 200)
        }
    }

    override fun setIsFinalEpisode(isFinal: Boolean) {
        isFinalEpisode = isFinal
    }

    @OptIn(UnstableApi::class)
    override fun attach(mediaUrl: String, startPositionMs: Long) {
        release()
        _playbackState.value = PlaybackUiState(state = PlaybackState.PREPARING_PLAYER)

        val exoPlayer = ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(mediaUrl))
            seekTo(startPositionMs)
            prepare()
            val listener = createListener()
            playerListener = listener
            addListener(listener)
        }
        player = exoPlayer
        handler.post(progressRunnable)
    }

    override fun play() {
        val current = _playbackState.value.state
        if (current == PlaybackState.ENDED || current == PlaybackState.BRANCH_READY) {
            player?.seekTo(0)
        }
        player?.play()
    }

    override fun pause() {
        player?.pause()
    }

    override fun seekTo(positionMs: Long) {
        _playbackState.value = _playbackState.value.copy(state = PlaybackState.SEEKING)
        player?.seekTo(positionMs)
    }

    override fun release() {
        handler.removeCallbacks(progressRunnable)
        playerListener?.let { listener ->
            player?.removeListener(listener)
        }
        playerListener = null
        player?.release()
        player = null
        _playbackState.value = PlaybackUiState()
    }

    private fun createListener(): Player.Listener {
        return object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                when (playbackState) {
                    Player.STATE_IDLE -> {
                        _playbackState.value = _playbackState.value.copy(state = PlaybackState.IDLE)
                    }
                    Player.STATE_BUFFERING -> {
                        _playbackState.value = _playbackState.value.copy(state = PlaybackState.BUFFERING)
                    }
                    Player.STATE_READY -> {
                        val p = player ?: return
                        val currentState = _playbackState.value.state
                        if (currentState == PlaybackState.SEEKING) {
                            if (p.isPlaying) {
                                _playbackState.value = _playbackState.value.copy(state = PlaybackState.PLAYING)
                            } else {
                                _playbackState.value = _playbackState.value.copy(state = PlaybackState.PAUSED)
                            }
                        } else if (currentState != PlaybackState.PLAYING && currentState != PlaybackState.PAUSED) {
                            _playbackState.value = _playbackState.value.copy(state = PlaybackState.READY)
                        }
                    }
                    Player.STATE_ENDED -> {
                        val finalState = if (isFinalEpisode) PlaybackState.BRANCH_READY else PlaybackState.ENDED
                        _playbackState.value = _playbackState.value.copy(
                            state = finalState,
                            isFinalEpisode = isFinalEpisode
                        )
                    }
                }
            }

            override fun onIsPlayingChanged(isPlaying: Boolean) {
                if (isPlaying) {
                    _playbackState.value = _playbackState.value.copy(state = PlaybackState.PLAYING)
                } else {
                    val current = _playbackState.value.state
                    if (current == PlaybackState.PLAYING) {
                        _playbackState.value = _playbackState.value.copy(state = PlaybackState.PAUSED)
                    }
                }
            }

            override fun onPlayerError(error: PlaybackException) {
                _playbackState.value = _playbackState.value.copy(
                    state = PlaybackState.ERROR,
                    errorMessage = error.message ?: "播放失败"
                )
            }
        }
    }
}
