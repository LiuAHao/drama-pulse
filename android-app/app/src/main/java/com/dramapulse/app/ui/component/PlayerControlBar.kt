package com.dramapulse.app.ui.component

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.dramapulse.app.core.player.PlaybackUiState
import com.dramapulse.app.core.util.TimeUtil

@Composable
fun PlayerControlBar(
    playbackState: PlaybackUiState,
    onSeek: (Long) -> Unit,
    modifier: Modifier = Modifier
) {
    var isDragging by remember { mutableStateOf(false) }
    var previewFraction by remember { mutableFloatStateOf(playbackState.progressFraction) }

    if (!isDragging) {
        previewFraction = playbackState.progressFraction
    }

    val previewPositionMs = if (isDragging) {
        (previewFraction * playbackState.durationMs).toLong()
    } else {
        playbackState.currentPositionMs
    }

    Column(modifier = modifier.fillMaxWidth()) {
        ProgressSlider(
            progress = if (isDragging) previewFraction else playbackState.progressFraction,
            onSeekPreview = { fraction ->
                isDragging = true
                previewFraction = fraction
            },
            onSeekFinished = { fraction ->
                isDragging = false
                previewFraction = fraction
                val targetMs = (fraction * playbackState.durationMs).toLong()
                onSeek(targetMs)
            }
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = TimeUtil.formatDuration(previewPositionMs),
                style = MaterialTheme.typography.labelMedium,
                color = Color.White
            )
            Text(
                text = " / ",
                style = MaterialTheme.typography.labelMedium,
                color = Color.White.copy(alpha = 0.6f)
            )
            Text(
                text = TimeUtil.formatDuration(playbackState.durationMs),
                style = MaterialTheme.typography.labelMedium,
                color = Color.White.copy(alpha = 0.6f)
            )
        }
    }
}
