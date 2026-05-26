package com.dramapulse.app.ui.overlay

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.dramapulse.app.core.model.HighlightModel
import com.dramapulse.app.core.model.HighlightType
import com.dramapulse.app.ui.theme.ConflictPrimary
import com.dramapulse.app.ui.theme.FeelGoodPrimary
import com.dramapulse.app.ui.theme.FeelGoodSecondary
import com.dramapulse.app.ui.theme.ReversalPrimary
import com.dramapulse.app.ui.theme.SweetPrimary

@Composable
fun HighlightOverlay(
    highlight: HighlightModel?,
    interactionEnabled: Boolean,
    interactionClickCount: Int,
    onInteractionClick: (String, String) -> Unit,
    modifier: Modifier = Modifier
) {
    AnimatedVisibility(
        visible = highlight != null,
        enter = fadeIn(animationSpec = tween(180)) + scaleIn(
            initialScale = 0.92f,
            animationSpec = spring(dampingRatio = 0.74f, stiffness = 520f)
        ),
        exit = fadeOut(animationSpec = tween(140)) + scaleOut(targetScale = 0.94f),
        modifier = modifier.fillMaxWidth()
    ) {
        if (highlight == null) return@AnimatedVisibility

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 18.dp, vertical = 10.dp),
            contentAlignment = Alignment.BottomCenter
        ) {
            if (highlight.isQuickPrompt) {
                QuickSendPrompt(
                    highlight = highlight,
                    interactionEnabled = interactionEnabled,
                    onClick = { option ->
                        onInteractionClick(highlight.id, option)
                    }
                )
            } else {
                HighlightImpactCard(
                    highlight = highlight,
                    interactionEnabled = interactionEnabled,
                    interactionClickCount = interactionClickCount,
                    onClick = {
                        onInteractionClick(
                            highlight.id,
                            highlight.optionTextAt(interactionClickCount)
                        )
                    }
                )
            }
        }
    }
}

@Composable
private fun QuickSendPrompt(
    highlight: HighlightModel,
    interactionEnabled: Boolean,
    onClick: (String) -> Unit
) {
    val accent = highlight.type.primaryColor()
    val options = remember(highlight.id, highlight.interactionOptions) {
        highlight.interactionOptions.take(3).ifEmpty {
            listOf(com.dramapulse.app.core.model.HighlightOption(text = highlight.type.fallbackOptionText()))
        }
    }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text(
            text = highlight.title.ifBlank { "这段有感觉" },
            style = MaterialTheme.typography.labelLarge,
            color = Color.White.copy(alpha = 0.82f)
        )
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            options.forEach { option ->
                Text(
                    text = option.text,
                    style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold),
                    color = Color.White,
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(
                            if (interactionEnabled) accent.copy(alpha = 0.92f) else Color.White.copy(alpha = 0.18f)
                        )
                        .clickable(enabled = interactionEnabled) { onClick(option.text) }
                        .padding(horizontal = 14.dp, vertical = 10.dp)
                )
            }
        }
    }
}

@Composable
private fun HighlightImpactCard(
    highlight: HighlightModel,
    interactionEnabled: Boolean,
    interactionClickCount: Int,
    onClick: () -> Unit
) {
    val infinite = rememberInfiniteTransition(label = "highlight_overlay")
    val pulse by infinite.animateFloat(
        initialValue = 0.96f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(820, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "highlight_pulse"
    )
    val accent by animateColorAsState(
        targetValue = if (interactionEnabled) highlight.type.primaryColor() else Color.White.copy(alpha = 0.42f),
        animationSpec = tween(180),
        label = "highlight_accent"
    )

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxWidth(0.42f)
            .height(154.dp),
        contentAlignment = Alignment.BottomCenter
    ) {
        val haloAlpha = (0.18f + (interactionClickCount.coerceAtMost(6) * 0.03f)).coerceAtMost(0.36f)

        when (highlight.type) {
            HighlightType.FEEL_GOOD -> {
                GlowHalo(
                    colors = listOf(FeelGoodSecondary.copy(alpha = haloAlpha), FeelGoodPrimary.copy(alpha = 0.12f)),
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .size(148.dp)
                )
            }
            HighlightType.REVERSAL -> {
                GlowHalo(
                    colors = listOf(ReversalPrimary.copy(alpha = haloAlpha), Color.White.copy(alpha = 0.1f)),
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .size(144.dp)
                )
            }
            HighlightType.CONFLICT -> {
                FlameFrame(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(bottom = 10.dp),
                    alpha = haloAlpha + 0.12f
                )
            }
            HighlightType.SWEET -> {
                HeartAura(
                    modifier = Modifier.fillMaxSize(),
                    alpha = haloAlpha + 0.08f
                )
            }
            else -> {
                GlowHalo(
                    colors = listOf(accent.copy(alpha = haloAlpha), accent.copy(alpha = 0.12f)),
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .size(140.dp)
                )
            }
        }

        Box(
            modifier = Modifier
                .scale(if (interactionEnabled) pulse else 1f)
                .widthIn(max = 180.dp)
                .clip(RoundedCornerShape(28.dp))
                .background(Color.Black.copy(alpha = 0.18f))
                .clickable(enabled = interactionEnabled, onClick = onClick)
                .padding(horizontal = 18.dp, vertical = 14.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = highlight.type.displayGlyph(),
                    style = MaterialTheme.typography.headlineLarge.copy(
                        fontWeight = FontWeight.Black
                    ),
                    color = accent,
                    textAlign = TextAlign.Center
                )
                Text(
                    text = highlight.title.ifBlank { highlight.type.fallbackOptionText() },
                    style = MaterialTheme.typography.labelLarge,
                    color = Color.White.copy(alpha = 0.88f),
                    maxLines = 1
                )
            }
        }
    }
}

@Composable
private fun GlowHalo(
    colors: List<Color>,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .blur(14.dp)
            .background(
                brush = Brush.radialGradient(colors = colors),
                shape = CircleShape
            )
    )
}

@Composable
private fun FlameFrame(
    modifier: Modifier = Modifier,
    alpha: Float
) {
    Canvas(modifier = modifier) {
        val strokeWidth = 8.dp.toPx()
        val color = ConflictPrimary.copy(alpha = alpha.coerceIn(0f, 1f))
        drawRoundRect(
            brush = Brush.horizontalGradient(
                colors = listOf(color.copy(alpha = 0.12f), color, color.copy(alpha = 0.14f))
            ),
            topLeft = Offset(12.dp.toPx(), size.height * 0.42f),
            size = Size(size.width - 24.dp.toPx(), size.height * 0.36f),
            cornerRadius = CornerRadius(28.dp.toPx(), 28.dp.toPx()),
            style = Stroke(width = strokeWidth)
        )
    }
}

@Composable
private fun HeartAura(
    modifier: Modifier = Modifier,
    alpha: Float
) {
    Canvas(modifier = modifier) {
        val color = SweetPrimary.copy(alpha = alpha.coerceIn(0f, 1f))
        repeat(5) { index ->
            val radius = 16.dp.toPx() + index * 10.dp.toPx()
            drawCircle(
                color = color.copy(alpha = (alpha - index * 0.04f).coerceAtLeast(0.04f)),
                radius = radius,
                center = Offset(size.width / 2f, size.height * 0.72f)
            )
        }
    }
}

private fun HighlightType.displayGlyph(): String = when (this) {
    HighlightType.FEEL_GOOD -> "爽"
    HighlightType.REVERSAL -> "卧槽"
    HighlightType.CONFLICT -> "燃"
    HighlightType.SWEET -> "❤"
    HighlightType.FUNNY -> "哈"
    HighlightType.SUSPENSE -> "?"
    HighlightType.EMOTION_BURST -> "炸"
}

private fun HighlightType.primaryColor(): Color = when (this) {
    HighlightType.FEEL_GOOD -> FeelGoodPrimary
    HighlightType.REVERSAL -> ReversalPrimary
    HighlightType.CONFLICT -> ConflictPrimary
    HighlightType.SWEET -> SweetPrimary
    HighlightType.FUNNY -> FeelGoodSecondary
    HighlightType.SUSPENSE -> ReversalPrimary
    HighlightType.EMOTION_BURST -> ConflictPrimary
}
