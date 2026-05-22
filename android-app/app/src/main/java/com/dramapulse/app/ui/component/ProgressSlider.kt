package com.dramapulse.app.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.dramapulse.app.ui.theme.Accent

@Composable
fun ProgressSlider(
    progress: Float,
    buffered: Float,
    onSeek: (Float) -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(20.dp)
            .padding(horizontal = 16.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(3.dp)
                .align(androidx.compose.ui.Alignment.CenterStart)
                .clip(RoundedCornerShape(1.5.dp))
                .background(Color.White.copy(alpha = 0.2f))
        )
        Box(
            modifier = Modifier
                .fillMaxWidth(fraction = buffered)
                .height(3.dp)
                .align(androidx.compose.ui.Alignment.CenterStart)
                .clip(RoundedCornerShape(1.5.dp))
                .background(Color.White.copy(alpha = 0.3f))
        )
        Box(
            modifier = Modifier
                .fillMaxWidth(fraction = progress)
                .height(3.dp)
                .align(androidx.compose.ui.Alignment.CenterStart)
                .clip(RoundedCornerShape(1.5.dp))
                .background(Accent)
        )
    }
}
