package com.dramapulse.app.ui.component

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.dramapulse.app.core.model.EpisodeModel

@Composable
fun PlayerTopBar(
    episode: EpisodeModel?,
    onBack: () -> Unit,
    onSelectEpisode: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onBack) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "返回",
                tint = Color.White
            )
        }
        Spacer(modifier = Modifier.width(8.dp))
        if (episode != null) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = episode.title,
                    style = MaterialTheme.typography.bodyLarge,
                    color = Color.White,
                    maxLines = 1
                )
            }
        }
        Spacer(modifier = Modifier.weight(1f))
        TextButton(onClick = onSelectEpisode) {
            Text(
                text = "选集",
                color = Color.White
            )
        }
    }
}
