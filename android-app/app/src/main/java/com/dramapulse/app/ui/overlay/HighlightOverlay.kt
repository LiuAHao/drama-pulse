package com.dramapulse.app.ui.overlay

import androidx.compose.animation.*
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
import com.dramapulse.app.core.model.HighlightModel
import com.dramapulse.app.core.model.HighlightTemplate
import com.dramapulse.app.ui.theme.Accent

@Composable
fun HighlightOverlay(
    highlight: HighlightModel?,
    onInteractionClick: (String, String) -> Unit,
    modifier: Modifier = Modifier
) {
    AnimatedVisibility(
        visible = highlight != null,
        enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
        exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
        modifier = modifier
    ) {
        if (highlight == null) return@AnimatedVisibility

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 24.dp),
            contentAlignment = Alignment.BottomCenter
        ) {
            when (highlight.templateId) {
                HighlightTemplate.EMOTION_BUTTON -> EmotionButtonGroup(
                    title = highlight.title,
                    options = highlight.interactionOptions,
                    onClick = { text -> onInteractionClick(highlight.id, text) }
                )
                HighlightTemplate.VOTE_SIDE -> VoteSidePanel(
                    title = highlight.title,
                    options = highlight.interactionOptions,
                    onClick = { text -> onInteractionClick(highlight.id, text) }
                )
                else -> EmotionButtonGroup(
                    title = highlight.title,
                    options = highlight.interactionOptions,
                    onClick = { text -> onInteractionClick(highlight.id, text) }
                )
            }
        }
    }
}

@Composable
private fun EmotionButtonGroup(
    title: String,
    options: List<com.dramapulse.app.core.model.HighlightOption>,
    onClick: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.9f))
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        if (title.isNotEmpty()) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(12.dp))
        }
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            options.take(4).forEach { option ->
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(24.dp))
                        .background(Accent)
                        .clickable { onClick(option.text) }
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = option.text,
                        style = MaterialTheme.typography.labelLarge,
                        color = Color.White
                    )
                }
            }
        }
    }
}

@Composable
private fun VoteSidePanel(
    title: String,
    options: List<com.dramapulse.app.core.model.HighlightOption>,
    onClick: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.9f))
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        if (title.isNotEmpty()) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(12.dp))
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            options.take(2).forEach { option ->
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Accent)
                        .clickable { onClick(option.text) },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = option.text,
                        style = MaterialTheme.typography.bodyLarge,
                        color = Color.White
                    )
                }
            }
        }
    }
}
