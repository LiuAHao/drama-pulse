package com.dramapulse.app.core.audio

import android.content.Context
import android.media.audiofx.LoudnessEnhancer
import android.media.MediaPlayer
import androidx.annotation.RawRes
import com.dramapulse.app.R
import com.dramapulse.app.core.model.HighlightType

private const val DEFAULT_HIGHLIGHT_GAIN_MB = 1200
private const val CONFLICT_HIGHLIGHT_GAIN_MB = 1600

interface HighlightSoundPlayer {
    fun playIfIdle(type: HighlightType): Boolean

    fun release() = Unit
}

object NoOpHighlightSoundPlayer : HighlightSoundPlayer {
    override fun playIfIdle(type: HighlightType): Boolean = true
}

class AndroidHighlightSoundPlayer(
    context: Context
) : HighlightSoundPlayer {

    private val appContext = context.applicationContext
    private var mediaPlayer: MediaPlayer? = null
    private var loudnessEnhancer: LoudnessEnhancer? = null
    private var isPlaying: Boolean = false

    override fun playIfIdle(type: HighlightType): Boolean {
        val soundResId = type.highlightSoundResId() ?: return true
        if (isPlaying) return false

        val player = MediaPlayer.create(appContext, soundResId) ?: return true
        mediaPlayer?.release()
        mediaPlayer = player
        isPlaying = true
        val volume = type.highlightSoundVolume()
        player.setVolume(volume, volume)
        loudnessEnhancer?.release()
        loudnessEnhancer = LoudnessEnhancer(player.audioSessionId).apply {
            setTargetGain(type.highlightSoundGainMb())
            enabled = true
        }

        player.setOnCompletionListener { completedPlayer ->
            releaseInternal(completedPlayer)
        }
        player.setOnErrorListener { erroredPlayer, _, _ ->
            releaseInternal(erroredPlayer)
            true
        }
        player.start()
        return true
    }

    override fun release() {
        loudnessEnhancer?.release()
        loudnessEnhancer = null
        mediaPlayer?.release()
        mediaPlayer = null
        isPlaying = false
    }

    private fun releaseInternal(player: MediaPlayer) {
        loudnessEnhancer?.release()
        loudnessEnhancer = null
        player.release()
        if (mediaPlayer === player) {
            mediaPlayer = null
        }
        isPlaying = false
    }
}

@RawRes
private fun HighlightType.highlightSoundResId(): Int? = when (this) {
    HighlightType.REVERSAL -> R.raw.highlight_reversal_wocao
    HighlightType.FUNNY -> R.raw.highlight_funny_laughter
    HighlightType.FEEL_GOOD -> R.raw.highlight_feel_good_shuang
    HighlightType.SWEET -> R.raw.highlight_sweet_warmth
    HighlightType.CONFLICT -> R.raw.highlight_conflict_fire
}

private fun HighlightType.highlightSoundVolume(): Float = when (this) {
    HighlightType.CONFLICT -> 1.0f
    HighlightType.REVERSAL -> 0.98f
    HighlightType.FUNNY -> 0.96f
    HighlightType.FEEL_GOOD -> 0.98f
    HighlightType.SWEET -> 0.94f
}

private fun HighlightType.highlightSoundGainMb(): Int = when (this) {
    HighlightType.CONFLICT -> CONFLICT_HIGHLIGHT_GAIN_MB
    HighlightType.REVERSAL,
    HighlightType.FUNNY,
    HighlightType.FEEL_GOOD,
    HighlightType.SWEET -> DEFAULT_HIGHLIGHT_GAIN_MB
}
