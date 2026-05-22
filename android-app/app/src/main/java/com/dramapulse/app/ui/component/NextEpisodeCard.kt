package com.dramapulse.app.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.dramapulse.app.core.model.EpisodeModel
import com.dramapulse.app.ui.theme.Accent

@Composable
fun NextEpisodeCard(
    nextEpisode: EpisodeModel?,
    onPlayNext: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (nextEpisode == null) return

    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp))
            .background(Color.Black.copy(alpha = 0.88f))
            .padding(24.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "本集结束",
                style = MaterialTheme.typography.bodyLarge,
                color = Color.White.copy(alpha = 0.6f)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = nextEpisode.title,
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(16.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(Accent)
                    .clickable(onClick = onPlayNext),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "播放下一集",
                    style = MaterialTheme.typography.bodyLarge,
                    color = Color.White
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "关闭",
                style = MaterialTheme.typography.bodySmall,
                color = Color.White.copy(alpha = 0.4f),
                modifier = Modifier.clickable(onClick = onDismiss)
            )
        }
    }
}
