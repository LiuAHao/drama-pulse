package com.dramapulse.app.ui.overlay

import androidx.compose.animation.*
import androidx.compose.foundation.background
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
import com.dramapulse.app.core.model.HighlightModel
import com.dramapulse.app.ui.theme.Accent

@Composable
fun HeatHintOverlay(
    highlight: HighlightModel?,
    modifier: Modifier = Modifier
) {
    val stats = highlight?.stats
    val showHeat = stats != null && stats.heatLevel > 0

    AnimatedVisibility(
        visible = showHeat,
        enter = fadeIn(),
        exit = fadeOut(),
        modifier = modifier
    ) {
        val currentStats = stats ?: return@AnimatedVisibility

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            contentAlignment = Alignment.TopEnd
        ) {
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.7f))
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "🔥",
                    style = MaterialTheme.typography.labelMedium
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = heatLevelText(currentStats.heatLevel),
                    style = MaterialTheme.typography.labelMedium,
                    color = Accent
                )
                if (currentStats.topOption.isNotEmpty()) {
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = currentStats.topOption,
                        style = MaterialTheme.typography.labelMedium,
                        color = Color.White.copy(alpha = 0.7f)
                    )
                }
            }
        }
    }
}

private fun heatLevelText(level: Int): String {
    return when (level) {
        1 -> "热度初起"
        2 -> "热度渐高"
        3 -> "爆点时刻"
        4 -> "全场沸腾"
        else -> ""
    }
}
