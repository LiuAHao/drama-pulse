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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.dramapulse.app.core.design.Dimens
import com.dramapulse.app.core.model.DramaCardModel

@Composable
fun DramaCard(
    drama: DramaCardModel,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    isLarge: Boolean = false
) {
    val height = if (isLarge) 240.dp else 180.dp
    val width = if (isLarge) 180.dp else 130.dp

    Box(
        modifier = modifier
            .width(width)
            .height(height)
            .clip(RoundedCornerShape(Dimens.CardRadius))
            .background(MaterialTheme.colorScheme.surface)
            .clickable(onClick = onClick)
    ) {
        AsyncImage(
            model = drama.coverUrl,
            contentDescription = drama.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize()
        )

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.7f)),
                        startY = height.value * 0.5f
                    )
                )
        )

        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(Dimens.PaddingS)
        ) {
            Text(
                text = drama.title,
                style = MaterialTheme.typography.labelLarge,
                color = Color.White,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            if (drama.mainGenre.isNotEmpty()) {
                Text(
                    text = drama.mainGenre,
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White.copy(alpha = 0.7f),
                    maxLines = 1
                )
            }
        }

        if (drama.isFeatured) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(Dimens.PaddingS)
                    .background(
                        MaterialTheme.colorScheme.primary,
                        RoundedCornerShape(4.dp)
                    )
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            ) {
                Text(
                    text = "主打",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White
                )
            }
        }
    }
}
