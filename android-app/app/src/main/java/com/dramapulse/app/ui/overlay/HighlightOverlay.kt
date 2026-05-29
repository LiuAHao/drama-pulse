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
import androidx.compose.foundation.Image
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
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalInspectionMode
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.tooling.preview.Preview
import com.dramapulse.app.R
import com.dramapulse.app.core.audio.AndroidHighlightSoundPlayer
import com.dramapulse.app.core.audio.HighlightSoundPlayer
import com.dramapulse.app.core.audio.NoOpHighlightSoundPlayer
import com.dramapulse.app.core.model.HighlightModel
import com.dramapulse.app.core.model.HighlightOption
import com.dramapulse.app.core.model.HighlightType
import com.dramapulse.app.ui.theme.ConflictPrimary
import com.dramapulse.app.ui.theme.FeelGoodPrimary
import com.dramapulse.app.ui.theme.FeelGoodSecondary
import com.dramapulse.app.ui.theme.FunnyPrimary
import com.dramapulse.app.ui.theme.ReversalPrimary
import com.dramapulse.app.ui.theme.SweetPrimary

// Reversal 组件的手调参数集中放这里，方便直接在 Android Studio 里反复改。
private val REVERSAL_CORE_SIZE = 128.dp
private val REVERSAL_BUTTON_SIZE = 200.dp
private val REVERSAL_BUTTON_HORIZONTAL_PADDING = 40.dp
private val REVERSAL_BUTTON_VERTICAL_PADDING = 40.dp
private val REVERSAL_HERO_BOTTOM_PADDING = 118.dp
private const val REVERSAL_BURST_LIMIT = 24
private const val REVERSAL_BURST_MIN_ROTATION = -24
private const val REVERSAL_BURST_MAX_ROTATION = 24
private const val REVERSAL_BURST_MIN_SIZE_DP = 68
private const val REVERSAL_BURST_MAX_SIZE_DP = 116
private const val QUICK_PROMPT_LONG_TEXT_THRESHOLD = 6
private const val REVERSAL_SLOT_JITTER_X_DP = 10
private const val REVERSAL_SLOT_JITTER_Y_DP = 10
private val QUICK_PROMPT_BOTTOM_OFFSET = 30.dp
private val QUICK_PROMPT_ROW_GAP = (-10).dp
private val PLAYER_HIGHLIGHT_OVERLAY_BOTTOM_INSET = 78.dp
private val FUNNY_HERO_SIZE = 192.dp
private val FUNNY_BUBBLE_SIZE = 88.dp
private val FUNNY_BUTTON_SIZE = 90.dp
private val FUNNY_BUTTON_HORIZONTAL_PADDING = REVERSAL_BUTTON_HORIZONTAL_PADDING
private val FUNNY_BUTTON_VERTICAL_PADDING = REVERSAL_BUTTON_VERTICAL_PADDING
private val FUNNY_HERO_BOTTOM_PADDING = 118.dp
private const val FUNNY_BURST_LIMIT = 20
private const val FUNNY_BURST_MIN_ROTATION = -12
private const val FUNNY_BURST_MAX_ROTATION = 12
private const val FUNNY_BURST_MIN_SIZE_DP = 18
private const val FUNNY_BURST_MAX_SIZE_DP = 92
private const val FUNNY_SLOT_JITTER_X_DP = 8
private const val FUNNY_SLOT_JITTER_Y_DP = 8
private val FUNNY_SLOT_INDICES = intArrayOf(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19)
private val FEEL_GOOD_HERO_SIZE = 232.dp
private val FEEL_GOOD_BUTTON_SIZE = 110.dp
private val FEEL_GOOD_BUTTON_HORIZONTAL_PADDING = REVERSAL_BUTTON_HORIZONTAL_PADDING
private val FEEL_GOOD_BUTTON_VERTICAL_PADDING = REVERSAL_BUTTON_VERTICAL_PADDING
private val FEEL_GOOD_HERO_BOTTOM_PADDING = 104.dp
private const val FEEL_GOOD_BURST_LIMIT = 20
private const val FEEL_GOOD_BURST_MIN_ROTATION = -18
private const val FEEL_GOOD_BURST_MAX_ROTATION = 18
private const val FEEL_GOOD_SLOT_JITTER_X_DP = 10
private const val FEEL_GOOD_SLOT_JITTER_Y_DP = 10
private val FEEL_GOOD_SLOT_INDICES = intArrayOf(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19)
private val CONFLICT_BUTTON_SIZE = 108.dp
private val CONFLICT_BUTTON_HORIZONTAL_PADDING = REVERSAL_BUTTON_HORIZONTAL_PADDING
private val CONFLICT_BUTTON_VERTICAL_PADDING = REVERSAL_BUTTON_VERTICAL_PADDING
private val CONFLICT_EDGE_HORIZONTAL_OVERFLOW = 34.dp
private val CONFLICT_EDGE_TOP_OVERFLOW = 30.dp
private val CONFLICT_EDGE_BOTTOM_OVERFLOW = 72.dp
private val CONFLICT_EDGE_SIDE_TOP_PADDING = 0.dp
private val CONFLICT_EDGE_SIDE_BOTTOM_PADDING = 56.dp
private val CONFLICT_EDGE_SIDE_HEIGHT = 820.dp
private const val CONFLICT_EDGE_WIDTH_SCALE = 1.08f
private val SWEET_HERO_SIZE = 208.dp
private val SWEET_BUTTON_SIZE = 104.dp
private val SWEET_BUTTON_HORIZONTAL_PADDING = REVERSAL_BUTTON_HORIZONTAL_PADDING
private val SWEET_BUTTON_VERTICAL_PADDING = REVERSAL_BUTTON_VERTICAL_PADDING
private val SWEET_HERO_BOTTOM_PADDING = 112.dp
private const val SWEET_BURST_LIMIT = 20
private const val SWEET_BURST_MIN_ROTATION = -10
private const val SWEET_BURST_MAX_ROTATION = 10
private const val SWEET_SLOT_JITTER_X_DP = 10
private const val SWEET_SLOT_JITTER_Y_DP = 10
private val SWEET_SLOT_INDICES = intArrayOf(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19)

@Composable
fun HighlightOverlay(
    highlight: HighlightModel?,
    interactionEnabled: Boolean,
    interactionClickCount: Int,
    onInteractionClick: (String, String) -> Unit,
    modifier: Modifier = Modifier
) {
    val soundPlayer = rememberHighlightSoundPlayer()

    AnimatedVisibility(
        visible = highlight != null,
        enter = fadeIn(animationSpec = tween(180)) + scaleIn(
            initialScale = 0.92f,
            animationSpec = spring(dampingRatio = 0.74f, stiffness = 520f)
        ),
        exit = fadeOut(animationSpec = tween(140)) + scaleOut(targetScale = 0.94f),
        modifier = modifier.fillMaxSize()
    ) {
        if (highlight == null) return@AnimatedVisibility

        if (highlight.isQuickPrompt) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 18.dp, vertical = 10.dp)
                    .padding(bottom = QUICK_PROMPT_BOTTOM_OFFSET),
                contentAlignment = Alignment.BottomCenter
            ) {
                QuickSendPrompt(
                    highlight = highlight,
                    interactionEnabled = interactionEnabled,
                    onClick = { option ->
                        if (soundPlayer.playIfIdle(highlight.type)) {
                            onInteractionClick(highlight.id, option)
                        }
                    }
                )
            }
        } else if (highlight.type == HighlightType.REVERSAL) {
            ReversalHighlightStage(
                highlight = highlight,
                interactionEnabled = interactionEnabled,
                interactionClickCount = interactionClickCount,
                soundPlayer = soundPlayer,
                onInteractionClick = { option ->
                    onInteractionClick(highlight.id, option)
                }
            )
        } else if (highlight.type == HighlightType.FUNNY) {
            FunnyHighlightStage(
                highlight = highlight,
                interactionEnabled = interactionEnabled,
                interactionClickCount = interactionClickCount,
                soundPlayer = soundPlayer,
                onInteractionClick = { option ->
                    onInteractionClick(highlight.id, option)
                }
            )
        } else if (highlight.type == HighlightType.FEEL_GOOD) {
            FeelGoodHighlightStage(
                highlight = highlight,
                interactionEnabled = interactionEnabled,
                interactionClickCount = interactionClickCount,
                soundPlayer = soundPlayer,
                onInteractionClick = { option ->
                    onInteractionClick(highlight.id, option)
                }
            )
        } else if (highlight.type == HighlightType.CONFLICT) {
            ConflictHighlightStage(
                highlight = highlight,
                interactionEnabled = interactionEnabled,
                interactionClickCount = interactionClickCount,
                soundPlayer = soundPlayer,
                onInteractionClick = { option ->
                    onInteractionClick(highlight.id, option)
                }
            )
        } else if (highlight.type == HighlightType.SWEET) {
            SweetHighlightStage(
                highlight = highlight,
                interactionEnabled = interactionEnabled,
                interactionClickCount = interactionClickCount,
                soundPlayer = soundPlayer,
                onInteractionClick = { option ->
                    onInteractionClick(highlight.id, option)
                }
            )
        } else {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 18.dp, vertical = 10.dp),
                contentAlignment = Alignment.BottomCenter
            ) {
                HighlightImpactCard(
                    highlight = highlight,
                    interactionEnabled = interactionEnabled,
                    interactionClickCount = interactionClickCount,
                    soundPlayer = soundPlayer,
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
private fun rememberHighlightSoundPlayer(): HighlightSoundPlayer {
    val context = LocalContext.current
    val inspectionMode = LocalInspectionMode.current
    val player = remember(context.applicationContext, inspectionMode) {
        if (inspectionMode) {
            NoOpHighlightSoundPlayer
        } else {
            AndroidHighlightSoundPlayer(context.applicationContext)
        }
    }

    androidx.compose.runtime.DisposableEffect(player) {
        onDispose { player.release() }
    }

    return player
}

@Composable
private fun QuickSendPrompt(
    highlight: HighlightModel,
    interactionEnabled: Boolean,
    onClick: (String) -> Unit
) {
    val options = remember(highlight.id, highlight.interactionOptions) {
        highlight.interactionOptions.take(3).ifEmpty {
            listOf(com.dramapulse.app.core.model.HighlightOption(text = highlight.type.fallbackOptionText()))
        }
    }
    val optionRows = remember(options) { arrangeQuickPromptRows(options) }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(QUICK_PROMPT_ROW_GAP)
        ) {
            optionRows.forEach { row ->
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    row.forEach { option ->
                        QuickPromptBubble(
                            text = option.text,
                            enabled = interactionEnabled,
                            onClick = { onClick(option.text) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun QuickPromptBubble(
    text: String,
    enabled: Boolean,
    onClick: () -> Unit
) {
    val infinite = rememberInfiniteTransition(label = "quick_prompt_bubble")
    val pulse by infinite.animateFloat(
        initialValue = 0.98f,
        targetValue = 1.04f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 920, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "quick_prompt_bubble_pulse"
    )

    Box(
        modifier = Modifier
            .widthIn(min = quickPromptBubbleMinWidth(text), max = quickPromptBubbleMaxWidth(text))
            .height(60.dp)
            .graphicsLayer {
                val scale = if (enabled) pulse else 1f
                scaleX = scale
                scaleY = scale
            }
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Image(
            painter = painterResource(id = R.drawable.highlight_danmaku_cloud_raw),
            contentDescription = null,
            contentScale = ContentScale.FillBounds,
            modifier = Modifier.fillMaxSize()
        )
        Text(
            text = text,
            style = MaterialTheme.typography.labelLarge.copy(
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold
            ),
            color = if (enabled) Color(0xFF1B2C45) else Color(0xFF6C7C91),
            maxLines = 1,
            modifier = Modifier.padding(horizontal = 14.dp)
        )
    }
}

private fun arrangeQuickPromptRows(
    options: List<HighlightOption>
): List<List<HighlightOption>> {
    if (options.isEmpty()) return emptyList()
    if (options.size == 1) return listOf(options)

    val longOptions = options.filter { it.text.length >= QUICK_PROMPT_LONG_TEXT_THRESHOLD }
    val shortOptions = options.filterNot { it.text.length >= QUICK_PROMPT_LONG_TEXT_THRESHOLD }

    if (longOptions.size == 1 && shortOptions.size == 2) {
        return listOf(listOf(longOptions.first()), shortOptions)
    }

    if (options.size == 2) {
        return listOf(options)
    }

    if (options.size == 3) {
        val sorted = options.sortedByDescending { it.text.length }
        return if (sorted.first().text.length >= QUICK_PROMPT_LONG_TEXT_THRESHOLD) {
            listOf(listOf(sorted.first()), listOf(sorted[1], sorted[2]))
        } else {
            listOf(listOf(sorted[0], sorted[1]), listOf(sorted[2]))
        }
    }

    return options.chunked(2)
}

private fun quickPromptBubbleMinWidth(text: String) = when {
    text.length <= 2 -> 72.dp
    text.length <= 4 -> 90.dp
    text.length <= 6 -> 112.dp
    else -> 132.dp
}

private fun quickPromptBubbleMaxWidth(text: String) = when {
    text.length <= 2 -> 92.dp
    text.length <= 4 -> 116.dp
    text.length <= 6 -> 148.dp
    text.length <= 8 -> 178.dp
    else -> 210.dp
}

@Composable
private fun HighlightImpactCard(
    highlight: HighlightModel,
    interactionEnabled: Boolean,
    interactionClickCount: Int,
    soundPlayer: HighlightSoundPlayer,
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
                .clickable(
                    enabled = interactionEnabled,
                    onClick = {
                        if (soundPlayer.playIfIdle(highlight.type)) {
                            onClick()
                        }
                    }
                )
                .padding(horizontal = 18.dp, vertical = 14.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = highlight.type.displayGlyph(),
                    style = MaterialTheme.typography.headlineLarge.copy(
                        fontWeight = FontWeight.Black
                    ),
                    color = accent,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@Composable
private fun ConflictHighlightStage(
    highlight: HighlightModel,
    interactionEnabled: Boolean,
    interactionClickCount: Int,
    soundPlayer: HighlightSoundPlayer,
    onInteractionClick: (String) -> Unit
) {
    var localBurstCount by remember(highlight.id) { mutableIntStateOf(0) }
    val conflictPulse = rememberInfiniteTransition(label = "conflict_pulse")
    val buttonScale by conflictPulse.animateFloat(
        initialValue = 0.95f,
        targetValue = 1.07f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1120, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "conflict_button_scale"
    )
    val edgeAlpha by conflictPulse.animateFloat(
        initialValue = 0.72f,
        targetValue = 0.96f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 980, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "conflict_edge_alpha"
    )
    val edgeScale by conflictPulse.animateFloat(
        initialValue = 0.98f,
        targetValue = 1.02f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1020, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "conflict_edge_scale"
    )

    Box(modifier = Modifier.fillMaxSize()) {
        if (localBurstCount > 0) {
            Image(
                painter = painterResource(id = R.drawable.highlight_conflict_edge_top_flame),
                contentDescription = null,
                contentScale = ContentScale.FillWidth,
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(start = 4.dp, end = 4.dp)
                    .fillMaxWidth()
                    .alpha(edgeAlpha)
                    .graphicsLayer {
                        translationY = -CONFLICT_EDGE_TOP_OVERFLOW.toPx()
                        scaleX = edgeScale * CONFLICT_EDGE_WIDTH_SCALE
                        scaleY = edgeScale
                    }
            )
            Image(
                painter = painterResource(id = R.drawable.highlight_conflict_edge_bottom_flame),
                contentDescription = null,
                contentScale = ContentScale.FillWidth,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(
                        start = 4.dp,
                        end = 4.dp
                    )
                    .fillMaxWidth()
                    .alpha(edgeAlpha)
                    .graphicsLayer {
                        translationY = (CONFLICT_EDGE_BOTTOM_OVERFLOW + PLAYER_HIGHLIGHT_OVERLAY_BOTTOM_INSET).toPx()
                        scaleX = edgeScale * CONFLICT_EDGE_WIDTH_SCALE
                        scaleY = edgeScale
                    }
            )
            Image(
                painter = painterResource(id = R.drawable.highlight_conflict_edge_left_flame),
                contentDescription = null,
                contentScale = ContentScale.FillHeight,
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .padding(top = CONFLICT_EDGE_SIDE_TOP_PADDING, bottom = CONFLICT_EDGE_SIDE_BOTTOM_PADDING)
                    .widthIn(min = 76.dp, max = 108.dp)
                    .height(CONFLICT_EDGE_SIDE_HEIGHT + PLAYER_HIGHLIGHT_OVERLAY_BOTTOM_INSET)
                    .alpha(edgeAlpha)
                    .graphicsLayer {
                        translationX = -CONFLICT_EDGE_HORIZONTAL_OVERFLOW.toPx()
                        translationY = (PLAYER_HIGHLIGHT_OVERLAY_BOTTOM_INSET / 2).toPx()
                        scaleX = edgeScale
                        scaleY = edgeScale
                    }
            )
            Image(
                painter = painterResource(id = R.drawable.highlight_conflict_edge_right_flame),
                contentDescription = null,
                contentScale = ContentScale.FillHeight,
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .padding(top = CONFLICT_EDGE_SIDE_TOP_PADDING, bottom = CONFLICT_EDGE_SIDE_BOTTOM_PADDING)
                    .widthIn(min = 76.dp, max = 108.dp)
                    .height(CONFLICT_EDGE_SIDE_HEIGHT + PLAYER_HIGHLIGHT_OVERLAY_BOTTOM_INSET)
                    .alpha(edgeAlpha)
                    .graphicsLayer {
                        translationX = CONFLICT_EDGE_HORIZONTAL_OVERFLOW.toPx()
                        translationY = (PLAYER_HIGHLIGHT_OVERLAY_BOTTOM_INSET / 2).toPx()
                        scaleX = edgeScale
                        scaleY = edgeScale
                    }
            )
        }

        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(
                    horizontal = CONFLICT_BUTTON_HORIZONTAL_PADDING,
                    vertical = CONFLICT_BUTTON_VERTICAL_PADDING
                )
        ) {
            Box(
                modifier = Modifier
                    .size(CONFLICT_BUTTON_SIZE)
                    .scale(if (interactionEnabled) buttonScale else 1f)
                    .clickable(enabled = interactionEnabled) {
                        if (soundPlayer.playIfIdle(highlight.type)) {
                            localBurstCount += 1
                            onInteractionClick(highlight.optionTextAt(interactionClickCount))
                        }
                    },
                contentAlignment = Alignment.Center
            ) {
                Image(
                    painter = painterResource(id = R.drawable.highlight_conflict_button_fire_core),
                    contentDescription = "冲突组件",
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.fillMaxSize()
                )
            }
        }
    }
}

@Composable
private fun FeelGoodHighlightStage(
    highlight: HighlightModel,
    interactionEnabled: Boolean,
    interactionClickCount: Int,
    soundPlayer: HighlightSoundPlayer,
    onInteractionClick: (String) -> Unit
) {
    var localBurstCount by remember(highlight.id) { mutableIntStateOf(0) }
    val burstItems = remember(highlight.id) { mutableStateListOf<FeelGoodBurst>() }
    val feelGoodPulse = rememberInfiniteTransition(label = "feel_good_hero_pulse")
    val heroScale by feelGoodPulse.animateFloat(
        initialValue = 0.96f,
        targetValue = 1.04f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 920, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "feel_good_hero_scale"
    )
    val buttonScale by feelGoodPulse.animateFloat(
        initialValue = 0.95f,
        targetValue = 1.07f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1080, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "feel_good_button_scale"
    )

    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val containerWidth = maxWidth
        val containerHeight = maxHeight
        val slots = remember(containerWidth, containerHeight) {
            feelGoodBurstSlots(containerWidth, containerHeight)
        }

        burstItems.forEach { item ->
            FeelGoodBurstItem(
                item = item,
                modifier = Modifier
                    .align(item.alignment)
                    .offset(x = item.offsetX, y = item.offsetY)
            )
        }

        if (localBurstCount > 0) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = FEEL_GOOD_HERO_BOTTOM_PADDING)
            ) {
                Image(
                    painter = painterResource(id = R.drawable.highlight_feel_good_burst_flash),
                    contentDescription = null,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .size(FEEL_GOOD_HERO_SIZE + 56.dp)
                        .align(Alignment.Center)
                        .graphicsLayer {
                            scaleX = heroScale
                            scaleY = heroScale
                        }
                )
                Image(
                    painter = painterResource(id = R.drawable.highlight_feel_good_hero_shuang),
                    contentDescription = null,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .size(FEEL_GOOD_HERO_SIZE)
                        .align(Alignment.Center)
                        .graphicsLayer {
                            scaleX = heroScale
                            scaleY = heroScale
                        }
                )
            }
        }

        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(
                    horizontal = FEEL_GOOD_BUTTON_HORIZONTAL_PADDING,
                    vertical = FEEL_GOOD_BUTTON_VERTICAL_PADDING
                )
        ) {
            FeelGoodButton(
                interactionEnabled = interactionEnabled,
                pulseScale = if (interactionEnabled) buttonScale else 1f,
                onClick = {
                    if (soundPlayer.playIfIdle(highlight.type)) {
                        localBurstCount += 1
                        val random = kotlin.random.Random(
                            highlight.id.hashCode() * 67 + localBurstCount * 71 + interactionClickCount * 23
                        )
                        burstItems.clear()
                        slots.forEachIndexed { index, slot ->
                            val drawableRes = when {
                                index in setOf(0, 3, 7) -> R.drawable.highlight_feel_good_edge_shuang
                                index % 4 == 0 -> R.drawable.highlight_feel_good_shard_cluster
                                index % 3 == 0 -> R.drawable.highlight_feel_good_streak_cluster
                                else -> R.drawable.highlight_feel_good_sparkle_cluster
                            }
                            burstItems += generateFeelGoodBurst(
                                random = random,
                                drawableRes = drawableRes,
                                slot = slot
                            )
                        }
                        while (burstItems.size > FEEL_GOOD_BURST_LIMIT) {
                            burstItems.removeAt(0)
                        }
                        onInteractionClick(highlight.optionTextAt(interactionClickCount))
                    }
                }
            )
        }
    }
}

private fun feelGoodBurstSlots(
    containerWidth: androidx.compose.ui.unit.Dp,
    containerHeight: androidx.compose.ui.unit.Dp
): List<HighlightBurstSlot> {
    return selectBurstSlots(
        allSlots = perimeterBurstSlots(containerWidth, containerHeight),
        indices = FEEL_GOOD_SLOT_INDICES
    )
}

private data class FeelGoodBurst(
    val drawableRes: Int,
    val alignment: Alignment,
    val offsetX: androidx.compose.ui.unit.Dp,
    val offsetY: androidx.compose.ui.unit.Dp,
    val size: androidx.compose.ui.unit.Dp,
    val alpha: Float,
    val rotation: Float,
    val pulseDurationMs: Int,
    val pulseScaleMax: Float
)

@Composable
private fun FeelGoodBurstItem(
    item: FeelGoodBurst,
    modifier: Modifier = Modifier
) {
    val infinite = rememberInfiniteTransition(label = "feel_good_burst_pulse_${item.drawableRes}")
    val pulseScale by infinite.animateFloat(
        initialValue = 0.95f,
        targetValue = item.pulseScaleMax,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = item.pulseDurationMs, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "feel_good_burst_scale"
    )
    val pulseAlpha by infinite.animateFloat(
        initialValue = (item.alpha - 0.14f).coerceAtLeast(0.36f),
        targetValue = item.alpha,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = item.pulseDurationMs + 140, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "feel_good_burst_alpha"
    )

    Image(
        painter = painterResource(id = item.drawableRes),
        contentDescription = null,
        contentScale = ContentScale.Fit,
        modifier = modifier
            .size(item.size)
            .alpha(pulseAlpha)
            .graphicsLayer {
                rotationZ = item.rotation
                scaleX = pulseScale
                scaleY = pulseScale
            }
    )
}

private fun generateFeelGoodBurst(
    random: kotlin.random.Random,
    drawableRes: Int,
    slot: HighlightBurstSlot
): FeelGoodBurst {
    val jitterX = random.nextInt(-FEEL_GOOD_SLOT_JITTER_X_DP, FEEL_GOOD_SLOT_JITTER_X_DP + 1).dp
    val jitterY = random.nextInt(-FEEL_GOOD_SLOT_JITTER_Y_DP, FEEL_GOOD_SLOT_JITTER_Y_DP + 1).dp
    val range = feelGoodSizeRange(drawableRes)
    val size = random.nextInt(range.first, range.last + 1).dp
    val alpha = 0.72f + random.nextFloat() * 0.18f
    val rotation = random.nextInt(
        FEEL_GOOD_BURST_MIN_ROTATION,
        FEEL_GOOD_BURST_MAX_ROTATION + 1
    ).toFloat()
    val pulseDurationMs = 880 + random.nextInt(0, 420)
    val pulseScaleMax = 1.08f + random.nextFloat() * 0.10f

    return FeelGoodBurst(
        drawableRes = drawableRes,
        alignment = slot.alignment,
        offsetX = slot.offsetX + jitterX,
        offsetY = slot.offsetY + jitterY,
        size = size,
        alpha = alpha,
        rotation = rotation,
        pulseDurationMs = pulseDurationMs,
        pulseScaleMax = pulseScaleMax
    )
}

@Composable
private fun FeelGoodButton(
    interactionEnabled: Boolean,
    pulseScale: Float,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(FEEL_GOOD_BUTTON_SIZE)
            .scale(pulseScale)
            .clickable(enabled = interactionEnabled, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Image(
            painter = painterResource(id = R.drawable.highlight_feel_good_button_shuang),
            contentDescription = "爽点组件",
            contentScale = ContentScale.Fit,
            modifier = Modifier.fillMaxSize()
        )
    }
}

private fun feelGoodSizeRange(
    drawableRes: Int
): IntRange = when (drawableRes) {
    R.drawable.highlight_feel_good_edge_shuang -> 72..104
    R.drawable.highlight_feel_good_sparkle_cluster -> 88..128
    R.drawable.highlight_feel_good_streak_cluster -> 98..144
    R.drawable.highlight_feel_good_shard_cluster -> 92..136
    else -> 92..132
}

@Composable
private fun SweetHighlightStage(
    highlight: HighlightModel,
    interactionEnabled: Boolean,
    interactionClickCount: Int,
    soundPlayer: HighlightSoundPlayer,
    onInteractionClick: (String) -> Unit
) {
    var localBurstCount by remember(highlight.id) { mutableIntStateOf(0) }
    val burstItems = remember(highlight.id) { mutableStateListOf<SweetBurst>() }
    val sweetPulse = rememberInfiniteTransition(label = "sweet_hero_pulse")
    val heroScale by sweetPulse.animateFloat(
        initialValue = 0.97f,
        targetValue = 1.03f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1320, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "sweet_hero_scale"
    )

    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val containerWidth = maxWidth
        val containerHeight = maxHeight
        val slots = remember(containerWidth, containerHeight) {
            sweetBurstSlots(containerWidth, containerHeight)
        }

        burstItems.forEach { item ->
            SweetBurstItem(
                item = item,
                modifier = Modifier
                    .align(item.alignment)
                    .offset(x = item.offsetX, y = item.offsetY)
            )
        }

        if (localBurstCount > 0) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = SWEET_HERO_BOTTOM_PADDING)
            ) {
                Image(
                    painter = painterResource(id = R.drawable.highlight_sweet_main_heart),
                    contentDescription = null,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .size(SWEET_HERO_SIZE)
                        .graphicsLayer {
                            scaleX = heroScale
                            scaleY = heroScale
                        }
                )
            }
        }

        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(
                    horizontal = SWEET_BUTTON_HORIZONTAL_PADDING,
                    vertical = SWEET_BUTTON_VERTICAL_PADDING
                )
        ) {
            SweetButton(
                interactionEnabled = interactionEnabled,
                pulseEnabled = interactionEnabled,
                onClick = {
                    if (soundPlayer.playIfIdle(highlight.type)) {
                        localBurstCount += 1
                        val random = kotlin.random.Random(
                            highlight.id.hashCode() * 53 + localBurstCount * 73 + interactionClickCount * 19
                        )
                        burstItems.clear()
                        slots
                            .forEachIndexed { index, slot ->
                                val drawableRes = when {
                                    index == slots.lastIndex ->
                                        R.drawable.highlight_sweet_drift_arc
                                    random.nextInt(10) <= 3 ->
                                        R.drawable.highlight_sweet_floating_heart_cluster_large
                                    random.nextInt(10) <= 7 ->
                                        R.drawable.highlight_sweet_floating_heart_cluster_small
                                    else ->
                                        R.drawable.highlight_sweet_light_particle_cluster
                                }
                                burstItems += generateSweetBurst(
                                    random = random,
                                    drawableRes = drawableRes,
                                    slot = slot
                                )
                            }
                        while (burstItems.size > SWEET_BURST_LIMIT) {
                            burstItems.removeAt(0)
                        }
                        onInteractionClick(highlight.optionTextAt(interactionClickCount))
                    }
                }
            )
        }
    }
}

private fun sweetBurstSlots(
    containerWidth: androidx.compose.ui.unit.Dp,
    containerHeight: androidx.compose.ui.unit.Dp
): List<HighlightBurstSlot> {
    return selectBurstSlots(
        allSlots = perimeterBurstSlots(containerWidth, containerHeight),
        indices = SWEET_SLOT_INDICES
    )
}

@Composable
private fun SweetButton(
    interactionEnabled: Boolean,
    pulseEnabled: Boolean,
    onClick: () -> Unit
) {
    val infinite = rememberInfiniteTransition(label = "sweet_button_pulse")
    val pulse by infinite.animateFloat(
        initialValue = 0.95f,
        targetValue = 1.06f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1240, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "sweet_button_scale"
    )

    Box(
        modifier = Modifier
            .size(SWEET_BUTTON_SIZE)
            .scale(if (pulseEnabled) pulse else 1f)
            .clickable(enabled = interactionEnabled, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Image(
            painter = painterResource(id = R.drawable.highlight_sweet_button_heart),
            contentDescription = "温情组件",
            contentScale = ContentScale.Fit,
            modifier = Modifier.fillMaxSize()
        )
    }
}

private data class SweetBurst(
    val drawableRes: Int,
    val alignment: Alignment,
    val offsetX: androidx.compose.ui.unit.Dp,
    val offsetY: androidx.compose.ui.unit.Dp,
    val size: androidx.compose.ui.unit.Dp,
    val alpha: Float,
    val rotation: Float,
    val pulseDurationMs: Int,
    val pulseScaleMax: Float
)

@Composable
private fun SweetBurstItem(
    item: SweetBurst,
    modifier: Modifier = Modifier
) {
    val infinite = rememberInfiniteTransition(label = "sweet_burst_pulse_${item.drawableRes}")
    val pulseScale by infinite.animateFloat(
        initialValue = 0.96f,
        targetValue = item.pulseScaleMax,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = item.pulseDurationMs, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "sweet_burst_scale"
    )
    val pulseAlpha by infinite.animateFloat(
        initialValue = (item.alpha - 0.16f).coerceAtLeast(0.32f),
        targetValue = item.alpha,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = item.pulseDurationMs + 160, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "sweet_burst_alpha"
    )

    Image(
        painter = painterResource(id = item.drawableRes),
        contentDescription = null,
        contentScale = ContentScale.Fit,
        modifier = modifier
            .size(item.size)
            .alpha(pulseAlpha)
            .graphicsLayer {
                rotationZ = item.rotation
                scaleX = pulseScale
                scaleY = pulseScale
            }
    )
}

private fun generateSweetBurst(
    random: kotlin.random.Random,
    drawableRes: Int,
    slot: HighlightBurstSlot
): SweetBurst {
    val jitterX = random.nextInt(-SWEET_SLOT_JITTER_X_DP, SWEET_SLOT_JITTER_X_DP + 1).dp
    val jitterY = random.nextInt(-SWEET_SLOT_JITTER_Y_DP, SWEET_SLOT_JITTER_Y_DP + 1).dp
    val size = random.nextInt(
        sweetSizeRange(drawableRes).first,
        sweetSizeRange(drawableRes).last + 1
    ).dp
    val alpha = 0.62f + random.nextFloat() * 0.22f
    val rotation = random.nextInt(
        SWEET_BURST_MIN_ROTATION,
        SWEET_BURST_MAX_ROTATION + 1
    ).toFloat()
    val pulseDurationMs = 1080 + random.nextInt(0, 520)
    val pulseScaleMax = 1.06f + random.nextFloat() * 0.08f

    return SweetBurst(
        drawableRes = drawableRes,
        alignment = slot.alignment,
        offsetX = slot.offsetX + jitterX,
        offsetY = slot.offsetY + jitterY,
        size = size,
        alpha = alpha,
        rotation = rotation,
        pulseDurationMs = pulseDurationMs,
        pulseScaleMax = pulseScaleMax
    )
}

private fun sweetSizeRange(
    drawableRes: Int
): IntRange = when (drawableRes) {
    R.drawable.highlight_sweet_floating_heart_cluster_large -> 112..148
    R.drawable.highlight_sweet_floating_heart_cluster_small -> 84..116
    R.drawable.highlight_sweet_light_particle_cluster -> 92..132
    R.drawable.highlight_sweet_drift_arc -> 128..176
    else -> 100..140
}

@Composable
private fun FunnyHighlightStage(
    highlight: HighlightModel,
    interactionEnabled: Boolean,
    interactionClickCount: Int,
    soundPlayer: HighlightSoundPlayer,
    onInteractionClick: (String) -> Unit
) {
    var localBurstCount by remember(highlight.id) { mutableIntStateOf(0) }
    val burstItems = remember(highlight.id) { mutableStateListOf<FunnyBurst>() }
    val heroPulse = rememberInfiniteTransition(label = "funny_hero_pulse")
    val heroScale by heroPulse.animateFloat(
        initialValue = 0.97f,
        targetValue = 1.04f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 980, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "funny_hero_scale"
    )
    val bubbleScale by heroPulse.animateFloat(
        initialValue = 0.96f,
        targetValue = 1.03f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 900, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "funny_bubble_scale"
    )

    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val containerWidth = maxWidth
        val containerHeight = maxHeight
        burstItems.forEach { item ->
            FunnyBurstItem(
                item = item,
                modifier = Modifier
                    .align(item.alignment)
                    .offset(x = item.offsetX, y = item.offsetY)
            )
        }

        if (localBurstCount > 0) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = FUNNY_HERO_BOTTOM_PADDING)
            ) {
                Image(
                    painter = painterResource(id = R.drawable.highlight_funny_hero_burst_ha),
                    contentDescription = null,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .size(FUNNY_HERO_SIZE)
                        .graphicsLayer {
                            scaleX = heroScale
                            scaleY = heroScale
                        }
                )
                Image(
                    painter = painterResource(id = R.drawable.highlight_funny_bubble_hahaha),
                    contentDescription = null,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .offset(x = 62.dp, y = (-10).dp)
                        .size(FUNNY_BUBBLE_SIZE)
                        .graphicsLayer {
                            scaleX = bubbleScale
                            scaleY = bubbleScale
                        }
                )
            }
        }

        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(
                    horizontal = FUNNY_BUTTON_HORIZONTAL_PADDING,
                    vertical = FUNNY_BUTTON_VERTICAL_PADDING
                )
        ) {
            FunnyButton(
                interactionEnabled = interactionEnabled,
                pulseEnabled = interactionEnabled,
                onClick = {
                    if (soundPlayer.playIfIdle(highlight.type)) {
                        localBurstCount += 1
                        val random = kotlin.random.Random(
                            highlight.id.hashCode() * 41 + localBurstCount * 89 + interactionClickCount * 17
                        )
                        burstItems.clear()
                        funnyBurstSlots(containerWidth, containerHeight)
                            .forEachIndexed { _, slot ->
                                val drawableRes = when (random.nextInt(10)) {
                                    in 0..6 -> R.drawable.highlight_funny_text_haha
                                    in 7..8 -> R.drawable.highlight_funny_sparkle_diamond
                                    else -> R.drawable.highlight_funny_sparkle_dot
                                }
                                burstItems += generateFunnyBurst(
                                    random = random,
                                    drawableRes = drawableRes,
                                    slot = slot
                                )
                            }
                        while (burstItems.size > FUNNY_BURST_LIMIT) {
                            burstItems.removeAt(0)
                        }
                        onInteractionClick(highlight.optionTextAt(interactionClickCount))
                    }
                }
            )
        }
    }
}

private fun funnyBurstSlots(
    containerWidth: androidx.compose.ui.unit.Dp,
    containerHeight: androidx.compose.ui.unit.Dp
): List<HighlightBurstSlot> {
    return selectBurstSlots(
        allSlots = perimeterBurstSlots(containerWidth, containerHeight),
        indices = FUNNY_SLOT_INDICES
    )
}

@Composable
private fun FunnyButton(
    interactionEnabled: Boolean,
    pulseEnabled: Boolean,
    onClick: () -> Unit
) {
    val infinite = rememberInfiniteTransition(label = "funny_button_pulse")
    val pulse by infinite.animateFloat(
        initialValue = 0.94f,
        targetValue = 1.08f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1120, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "funny_button_scale"
    )

    Box(
        modifier = Modifier
            .size(FUNNY_BUTTON_SIZE)
            .scale(if (pulseEnabled) pulse else 1f)
            .clickable(enabled = interactionEnabled, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Image(
            painter = painterResource(id = R.drawable.highlight_funny_button_ha),
            contentDescription = "笑点组件",
            contentScale = ContentScale.Fit,
            modifier = Modifier.fillMaxSize()
        )
    }
}

private data class FunnyBurst(
    val drawableRes: Int,
    val alignment: Alignment,
    val offsetX: androidx.compose.ui.unit.Dp,
    val offsetY: androidx.compose.ui.unit.Dp,
    val size: androidx.compose.ui.unit.Dp,
    val alpha: Float,
    val rotation: Float,
    val pulseDurationMs: Int,
    val pulseScaleMax: Float
)

@Composable
private fun FunnyBurstItem(
    item: FunnyBurst,
    modifier: Modifier = Modifier
) {
    val infinite = rememberInfiniteTransition(label = "funny_burst_pulse_${item.drawableRes}")
    val pulseScale by infinite.animateFloat(
        initialValue = 0.94f,
        targetValue = item.pulseScaleMax,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = item.pulseDurationMs, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "funny_burst_scale"
    )
    val pulseAlpha by infinite.animateFloat(
        initialValue = (item.alpha - 0.14f).coerceAtLeast(0.42f),
        targetValue = item.alpha,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = item.pulseDurationMs + 120, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "funny_burst_alpha"
    )

    Image(
        painter = painterResource(id = item.drawableRes),
        contentDescription = null,
        contentScale = ContentScale.Fit,
        modifier = modifier
            .size(item.size)
            .alpha(pulseAlpha)
            .graphicsLayer {
                rotationZ = item.rotation
                scaleX = pulseScale
                scaleY = pulseScale
            }
    )
}

private fun generateFunnyBurst(
    random: kotlin.random.Random,
    drawableRes: Int,
    slot: HighlightBurstSlot
): FunnyBurst {
    val jitterX = random.nextInt(-FUNNY_SLOT_JITTER_X_DP, FUNNY_SLOT_JITTER_X_DP + 1).dp
    val jitterY = random.nextInt(-FUNNY_SLOT_JITTER_Y_DP, FUNNY_SLOT_JITTER_Y_DP + 1).dp
    val sizeRange = funnySizeRange(drawableRes)
    val size = random.nextInt(sizeRange.first, sizeRange.last + 1).dp
    val alpha = 0.82f + random.nextFloat() * 0.14f
    val rotation = random.nextInt(
        FUNNY_BURST_MIN_ROTATION,
        FUNNY_BURST_MAX_ROTATION + 1
    ).toFloat()
    val pulseDurationMs = 860 + random.nextInt(0, 420)
    val pulseScaleMax = 1.10f + random.nextFloat() * 0.10f

    return FunnyBurst(
        drawableRes = drawableRes,
        alignment = slot.alignment,
        offsetX = slot.offsetX + jitterX,
        offsetY = slot.offsetY + jitterY,
        size = size,
        alpha = alpha,
        rotation = rotation,
        pulseDurationMs = pulseDurationMs,
        pulseScaleMax = pulseScaleMax
    )
}

private fun funnySizeRange(
    drawableRes: Int
): IntRange = when (drawableRes) {
    R.drawable.highlight_funny_sparkle_dot -> 12..18
    R.drawable.highlight_funny_sparkle_diamond -> 20..34
    R.drawable.highlight_funny_text_haha -> 48..72
    else -> FUNNY_BURST_MIN_SIZE_DP..FUNNY_BURST_MAX_SIZE_DP
}

@Composable
private fun ReversalHighlightStage(
    highlight: HighlightModel,
    interactionEnabled: Boolean,
    interactionClickCount: Int,
    soundPlayer: HighlightSoundPlayer,
    onInteractionClick: (String) -> Unit
) {
    var localBurstCount by remember(highlight.id) { mutableIntStateOf(0) }
    val burstItems = remember(highlight.id) { mutableStateListOf<ReversalBurst>() }
    val reversalPulse = rememberInfiniteTransition(label = "reversal_hero_pulse")
    val heroScale by reversalPulse.animateFloat(
        initialValue = 0.96f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 980, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "reversal_hero_scale"
    )

    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val containerWidth = maxWidth
        val containerHeight = maxHeight

        burstItems.forEach { item ->
            ReversalBurstItem(
                item = item,
                modifier = Modifier
                    .align(item.alignment)
                    .offset(x = item.offsetX, y = item.offsetY)
            )
        }

        if (localBurstCount > 0) {
            Image(
                painter = painterResource(id = R.drawable.highlight_reversal_core_wocao),
                contentDescription = null,
                contentScale = ContentScale.Fit,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = REVERSAL_HERO_BOTTOM_PADDING)
                    .size(REVERSAL_CORE_SIZE)
                    .graphicsLayer {
                        scaleX = heroScale
                        scaleY = heroScale
                    }
            )
        }

        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(
                    horizontal = REVERSAL_BUTTON_HORIZONTAL_PADDING,
                    vertical = REVERSAL_BUTTON_VERTICAL_PADDING
                )
        ) {
            ReversalButton(
                interactionEnabled = interactionEnabled,
                pulseEnabled = interactionEnabled,
                onClick = {
                    if (soundPlayer.playIfIdle(highlight.type)) {
                        localBurstCount += 1
                        val random = kotlin.random.Random(
                            highlight.id.hashCode() * 37 + localBurstCount * 97 + interactionClickCount * 13
                        )
                        burstItems.clear()
                        reversalBurstSlots(containerWidth, containerHeight)
                            .forEachIndexed { index, slot ->
                                val drawableRes = when ((index + random.nextInt(3)) % 3) {
                                    0 -> R.drawable.highlight_reversal_core_woc
                                    1 -> R.drawable.highlight_reversal_core_wocao
                                    else -> R.drawable.highlight_reversal_crack_cluster
                                }
                                burstItems += generateReversalBurst(
                                    random = random,
                                    drawableRes = drawableRes,
                                    slot = slot
                                )
                            }
                        while (burstItems.size > REVERSAL_BURST_LIMIT) {
                            burstItems.removeAt(0)
                        }
                        onInteractionClick(highlight.optionTextAt(interactionClickCount))
                    }
                }
            )
        }
    }
}

private data class HighlightBurstSlot(
    val alignment: Alignment,
    val offsetX: androidx.compose.ui.unit.Dp,
    val offsetY: androidx.compose.ui.unit.Dp
)

private fun perimeterBurstSlots(
    containerWidth: androidx.compose.ui.unit.Dp,
    containerHeight: androidx.compose.ui.unit.Dp
): List<HighlightBurstSlot> {
    val topInset = (-10).dp
    val bottomInset = PLAYER_HIGHLIGHT_OVERLAY_BOTTOM_INSET + 12.dp
    val sideInset = 18.dp
    val upperSideY = -(containerHeight * 0.34f)
    val midUpperSideY = -(containerHeight * 0.16f)
    val midLowerSideY = containerHeight * 0.04f
    val lowerSideY = containerHeight * 0.24f
    val topOuterLeftX = containerWidth * 0.06f
    val topInnerLeftX = -(containerWidth * 0.24f)
    val topCenterLeftX = -(containerWidth * 0.08f)
    val topCenterRightX = containerWidth * 0.08f
    val topInnerRightX = containerWidth * 0.24f
    val topOuterRightX = -(containerWidth * 0.06f)
    val bottomOuterLeftX = containerWidth * 0.06f
    val bottomInnerLeftX = -(containerWidth * 0.24f)
    val bottomCenterLeftX = -(containerWidth * 0.08f)
    val bottomCenterRightX = containerWidth * 0.08f
    val bottomInnerRightX = containerWidth * 0.24f
    val bottomOuterRightX = -(containerWidth * 0.06f)

    return listOf(
        HighlightBurstSlot(Alignment.TopStart, topOuterLeftX, topInset),
        HighlightBurstSlot(Alignment.TopCenter, topInnerLeftX, topInset),
        HighlightBurstSlot(Alignment.TopCenter, topCenterLeftX, topInset),
        HighlightBurstSlot(Alignment.TopCenter, topCenterRightX, topInset),
        HighlightBurstSlot(Alignment.TopCenter, topInnerRightX, topInset),
        HighlightBurstSlot(Alignment.TopEnd, topOuterRightX, topInset),
        HighlightBurstSlot(Alignment.CenterEnd, sideInset, upperSideY),
        HighlightBurstSlot(Alignment.CenterEnd, sideInset, midUpperSideY),
        HighlightBurstSlot(Alignment.CenterEnd, sideInset, midLowerSideY),
        HighlightBurstSlot(Alignment.CenterEnd, sideInset, lowerSideY),
        HighlightBurstSlot(Alignment.BottomEnd, bottomOuterRightX, bottomInset),
        HighlightBurstSlot(Alignment.BottomCenter, bottomInnerRightX, bottomInset),
        HighlightBurstSlot(Alignment.BottomCenter, bottomCenterRightX, bottomInset),
        HighlightBurstSlot(Alignment.BottomCenter, bottomCenterLeftX, bottomInset),
        HighlightBurstSlot(Alignment.BottomCenter, bottomInnerLeftX, bottomInset),
        HighlightBurstSlot(Alignment.BottomStart, bottomOuterLeftX, bottomInset),
        HighlightBurstSlot(Alignment.CenterStart, -sideInset, lowerSideY),
        HighlightBurstSlot(Alignment.CenterStart, -sideInset, midLowerSideY),
        HighlightBurstSlot(Alignment.CenterStart, -sideInset, midUpperSideY),
        HighlightBurstSlot(Alignment.CenterStart, -sideInset, upperSideY)
    )
}

private fun reversalBurstSlots(
    containerWidth: androidx.compose.ui.unit.Dp,
    containerHeight: androidx.compose.ui.unit.Dp
): List<HighlightBurstSlot> = perimeterBurstSlots(containerWidth, containerHeight)

private fun selectBurstSlots(
    allSlots: List<HighlightBurstSlot>,
    indices: IntArray
): List<HighlightBurstSlot> {
    val selected = mutableListOf<HighlightBurstSlot>()
    indices.forEach { index ->
        allSlots.getOrNull(index)?.let(selected::add)
    }
    return selected
}

@Composable
private fun ReversalButton(
    interactionEnabled: Boolean,
    pulseEnabled: Boolean,
    onClick: () -> Unit
) {
    val infinite = rememberInfiniteTransition(label = "reversal_button_pulse")
    val pulse by infinite.animateFloat(
        initialValue = 0.94f,
        targetValue = 1.08f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1180, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "reversal_button_scale"
    )

    Box(
        modifier = Modifier
            .size(REVERSAL_BUTTON_SIZE)
            .scale(if (pulseEnabled) pulse else 1f)
            .clickable(enabled = interactionEnabled, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Image(
            painter = painterResource(id = R.drawable.highlight_reversal_button),
            contentDescription = "反转组件",
            contentScale = ContentScale.Fit,
            modifier = Modifier.fillMaxSize()
        )
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

private data class ReversalBurst(
    val drawableRes: Int,
    val alignment: Alignment,
    val offsetX: androidx.compose.ui.unit.Dp,
    val offsetY: androidx.compose.ui.unit.Dp,
    val size: androidx.compose.ui.unit.Dp,
    val alpha: Float,
    val rotation: Float,
    val pulseDurationMs: Int,
    val pulseScaleMax: Float
)

@Composable
private fun ReversalBurstItem(
    item: ReversalBurst,
    modifier: Modifier = Modifier
) {
    val infinite = rememberInfiniteTransition(label = "reversal_burst_pulse_${item.drawableRes}")
    val pulseScale by infinite.animateFloat(
        initialValue = 0.94f,
        targetValue = item.pulseScaleMax,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = item.pulseDurationMs, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "reversal_burst_scale"
    )
    val pulseAlpha by infinite.animateFloat(
        initialValue = (item.alpha - 0.16f).coerceAtLeast(0.46f),
        targetValue = item.alpha,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = item.pulseDurationMs + 120, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "reversal_burst_alpha"
    )

    Image(
        painter = painterResource(id = item.drawableRes),
        contentDescription = null,
        contentScale = ContentScale.Fit,
        modifier = modifier
            .size(item.size)
            .alpha(pulseAlpha)
            .graphicsLayer {
                rotationZ = item.rotation
                scaleX = pulseScale
                scaleY = pulseScale
            }
    )
}

private fun generateReversalBurst(
    random: kotlin.random.Random,
    drawableRes: Int,
    slot: HighlightBurstSlot
): ReversalBurst {
    val jitterX = random.nextInt(-REVERSAL_SLOT_JITTER_X_DP, REVERSAL_SLOT_JITTER_X_DP + 1).dp
    val jitterY = random.nextInt(-REVERSAL_SLOT_JITTER_Y_DP, REVERSAL_SLOT_JITTER_Y_DP + 1).dp
    val size = random.nextInt(REVERSAL_BURST_MIN_SIZE_DP, REVERSAL_BURST_MAX_SIZE_DP + 1).dp
    val alpha = 0.74f + random.nextFloat() * 0.20f
    val rotation = random.nextInt(
        REVERSAL_BURST_MIN_ROTATION,
        REVERSAL_BURST_MAX_ROTATION + 1
    ).toFloat()
    val pulseDurationMs = 900 + random.nextInt(0, 540)
    val pulseScaleMax = 1.08f + random.nextFloat() * 0.12f

    return ReversalBurst(
        drawableRes = drawableRes,
        alignment = slot.alignment,
        offsetX = slot.offsetX + jitterX,
        offsetY = slot.offsetY + jitterY,
        size = size,
        alpha = alpha,
        rotation = rotation,
        pulseDurationMs = pulseDurationMs,
        pulseScaleMax = pulseScaleMax
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
}

private fun HighlightType.primaryColor(): Color = when (this) {
    HighlightType.FEEL_GOOD -> FeelGoodPrimary
    HighlightType.REVERSAL -> ReversalPrimary
    HighlightType.CONFLICT -> ConflictPrimary
    HighlightType.SWEET -> SweetPrimary
    HighlightType.FUNNY -> FunnyPrimary
}

@Preview(showBackground = true, backgroundColor = 0xFF000000, name = "Highlight Overlay - Reversal")
@Composable
private fun HighlightOverlayReversalPreview() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        HighlightOverlay(
            highlight = HighlightModel(
                id = "preview-reversal",
                episodeId = "preview-episode",
                startTimeMs = 0L,
                endTimeMs = 8_000L,
                interactionStartMs = 0L,
                interactionAppearMs = 0L,
                interactionEndMs = 8_000L,
                type = HighlightType.REVERSAL,
                title = "突然反转",
                description = "用于预览反转组件布局",
                intensity = 4,
                interactionOptions = listOf(
                    HighlightOption("卧槽"),
                    HighlightOption("没想到"),
                    HighlightOption("居然是他")
                ),
                stats = null
            ),
            interactionEnabled = true,
            interactionClickCount = 2,
            onInteractionClick = { _, _ -> }
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF000000, name = "Highlight Overlay - Funny")
@Composable
private fun HighlightOverlayFunnyPreview() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        HighlightOverlay(
            highlight = HighlightModel(
                id = "preview-funny",
                episodeId = "preview-episode",
                startTimeMs = 0L,
                endTimeMs = 8_000L,
                interactionStartMs = 0L,
                interactionAppearMs = 0L,
                interactionEndMs = 8_000L,
                type = HighlightType.FUNNY,
                title = "笑点来了",
                description = "用于预览笑点组件布局",
                intensity = 4,
                interactionOptions = listOf(
                    HighlightOption("哈哈哈"),
                    HighlightOption("绷不住了"),
                    HighlightOption("太搞了")
                ),
                stats = null
            ),
            interactionEnabled = true,
            interactionClickCount = 1,
            onInteractionClick = { _, _ -> }
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF000000, name = "Highlight Overlay - Feel Good")
@Composable
private fun HighlightOverlayFeelGoodPreview() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        HighlightOverlay(
            highlight = HighlightModel(
                id = "preview-feel-good",
                episodeId = "preview-episode",
                startTimeMs = 0L,
                endTimeMs = 8_000L,
                interactionStartMs = 0L,
                interactionAppearMs = 0L,
                interactionEndMs = 8_000L,
                type = HighlightType.FEEL_GOOD,
                title = "爽点来了",
                description = "用于预览爽点组件布局",
                intensity = 4,
                interactionOptions = listOf(
                    HighlightOption("爽了"),
                    HighlightOption("继续反杀"),
                    HighlightOption("太解气了")
                ),
                stats = null
            ),
            interactionEnabled = true,
            interactionClickCount = 1,
            onInteractionClick = { _, _ -> }
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF000000, name = "Highlight Overlay - Conflict")
@Composable
private fun HighlightOverlayConflictPreview() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        HighlightOverlay(
            highlight = HighlightModel(
                id = "preview-conflict",
                episodeId = "preview-episode",
                startTimeMs = 0L,
                endTimeMs = 8_000L,
                interactionStartMs = 0L,
                interactionAppearMs = 0L,
                interactionEndMs = 8_000L,
                type = HighlightType.CONFLICT,
                title = "冲突升级",
                description = "用于预览冲突组件布局",
                intensity = 4,
                interactionOptions = listOf(
                    HighlightOption("开怼"),
                    HighlightOption("别忍"),
                    HighlightOption("站她")
                ),
                stats = null
            ),
            interactionEnabled = true,
            interactionClickCount = 1,
            onInteractionClick = { _, _ -> }
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF000000, name = "Highlight Overlay - Sweet")
@Composable
private fun HighlightOverlaySweetPreview() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        HighlightOverlay(
            highlight = HighlightModel(
                id = "preview-sweet",
                episodeId = "preview-episode",
                startTimeMs = 0L,
                endTimeMs = 8_000L,
                interactionStartMs = 0L,
                interactionAppearMs = 0L,
                interactionEndMs = 8_000L,
                type = HighlightType.SWEET,
                title = "温情来了",
                description = "用于预览温情组件布局",
                intensity = 4,
                interactionOptions = listOf(
                    HighlightOption("心暖了"),
                    HighlightOption("被触动了"),
                    HighlightOption("护住这一刻")
                ),
                stats = null
            ),
            interactionEnabled = true,
            interactionClickCount = 1,
            onInteractionClick = { _, _ -> }
        )
    }
}
