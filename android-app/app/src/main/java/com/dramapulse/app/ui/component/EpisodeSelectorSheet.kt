package com.dramapulse.app.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
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
import com.dramapulse.app.core.model.EpisodeModel
import com.dramapulse.app.ui.theme.Accent

@Composable
fun EpisodeSelectorSheet(
    episodes: List<EpisodeModel>,
    currentIndex: Int,
    onSelect: (Int) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "选集",
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = "关闭",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.clickable(onClick = onDismiss)
            )
        }
        Spacer(modifier = Modifier.height(16.dp))
        LazyVerticalGrid(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 320.dp),
            columns = GridCells.Fixed(4),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            itemsIndexed(episodes) { index, episode ->
                val isSelected = index == currentIndex
                Box(
                    modifier = Modifier
                        .aspectRatio(1.5f)
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (isSelected) Accent else MaterialTheme.colorScheme.surfaceVariant)
                        .clickable { onSelect(index) },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "${episode.episodeNo}",
                        style = MaterialTheme.typography.bodyLarge,
                        color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(Dimens.PaddingS))
    }
}
