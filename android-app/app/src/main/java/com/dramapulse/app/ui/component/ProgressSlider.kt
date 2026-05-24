package com.dramapulse.app.ui.component

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import com.dramapulse.app.ui.theme.Accent

@Composable
fun ProgressSlider(
    progress: Float,
    onSeekPreview: (Float) -> Unit,
    onSeekFinished: (Float) -> Unit,
    modifier: Modifier = Modifier
) {
    Slider(
        value = progress.coerceIn(0f, 1f),
        onValueChange = onSeekPreview,
        onValueChangeFinished = { onSeekFinished(progress.coerceIn(0f, 1f)) },
        colors = SliderDefaults.colors(
            thumbColor = Accent,
            activeTrackColor = Accent,
            inactiveTrackColor = Color.White.copy(alpha = 0.2f)
        ),
        modifier = modifier
            .fillMaxWidth()
            .height(24.dp)
            .padding(horizontal = 16.dp)
    )
}
