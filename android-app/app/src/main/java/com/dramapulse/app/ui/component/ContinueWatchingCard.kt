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
import com.dramapulse.app.core.design.Dimens
import com.dramapulse.app.core.model.ContinueWatchingModel
import com.dramapulse.app.core.util.TimeUtil
import com.dramapulse.app.ui.theme.Accent

@Composable
fun ContinueWatchingCard(
    model: ContinueWatchingModel,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(Dimens.CardRadius))
            .background(MaterialTheme.colorScheme.surface)
            .clickable(onClick = onClick)
            .padding(Dimens.PaddingL),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "继续观看",
                style = MaterialTheme.typography.labelMedium,
                color = Accent
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = model.drama.title,
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "${model.episode.title} · ${TimeUtil.formatMs(model.progressMs)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
