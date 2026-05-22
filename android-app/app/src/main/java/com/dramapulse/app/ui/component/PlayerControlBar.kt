package com.dramapulse.app.ui.component

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.dramapulse.app.core.player.PlaybackUiState
import com.dramapulse.app.core.util.TimeUtil

@Composable
fun PlayerControlBar(
    playbackState: PlaybackUiState,
    onPlay: () -> Unit,
    onPause: () -> Unit,
    onSeek: (Long) -> Unit,
    onNextEpisode: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        ProgressSlider(
            progress = playbackState.progressFraction,
            buffered = playbackState.bufferedFraction,
            onSeek = { fraction ->
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
                text = TimeUtil.formatDuration(playbackState.currentPositionMs),
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
            Spacer(modifier = Modifier.weight(1f))

            if (playbackState.isPlaying) {
                IconButton(onClick = onPause) {
                    Icon(
                        imageVector = Icons.Default.Pause,
                        contentDescription = "暂停",
                        tint = Color.White
                    )
                }
            } else {
                IconButton(onClick = onPlay) {
                    Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = "播放",
                        tint = Color.White
                    )
                }
            }
            IconButton(onClick = onNextEpisode) {
                Icon(
                    imageVector = Icons.Default.SkipNext,
                    contentDescription = "下一集",
                    tint = Color.White
                )
            }
        }
    }
}
