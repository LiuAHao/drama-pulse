package com.dramapulse.app.feature.player

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dramapulse.app.core.data.PlayerDanmakuEntry
import com.dramapulse.app.core.model.HighlightModel
import com.dramapulse.app.core.model.HighlightOption
import com.dramapulse.app.core.model.HighlightType
import com.dramapulse.app.core.player.PlaybackUiState
import com.dramapulse.app.ui.overlay.HighlightOverlay
import com.dramapulse.app.ui.preview.PreviewData
import com.dramapulse.app.ui.theme.DramaPulseTheme

private val PREVIEW_DANMAKU_TOP_PADDING = 64.dp
private val PREVIEW_DANMAKU_OVERLAY_HEIGHT = 120.dp
private val PREVIEW_DANMAKU_TRACK_GAP = 32.dp
private val PREVIEW_DANMAKU_FONT_SIZE = 18.sp
private val PREVIEW_DANMAKU_COMPOSER_HEIGHT = 38.dp

@Preview(showBackground = true, backgroundColor = 0xFF000000, name = "Player - Bottom Bar")
@Composable
private fun PlayerBottomBarPreview() {
    DramaPulseTheme {
        PreviewPlayerBottomBar(
            episodeTitle = "第2集：系统兑现第一波物资",
            episodeSummary = "村里危机升级，主角第一次公开反击。",
            danmakuEnabled = true,
            danmakuInput = "",
            playbackState = PreviewData.playbackPlaying,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF000000, name = "Player - Screen Shell")
@Composable
private fun PlayerScreenShellPreview() {
    DramaPulseTheme {
        PlayerPreviewShell(
            uiState = PreviewData.playerState.copy(
                highlight = HighlightUiState(
                    activeHighlight = HighlightModel(
                        id = "preview-quick",
                        episodeId = "preview-episode",
                        startTimeMs = 0L,
                        endTimeMs = 8_000L,
                        interactionStartMs = 0L,
                        interactionAppearMs = 0L,
                        interactionEndMs = 8_000L,
                        type = HighlightType.FUNNY,
                        title = "",
                        description = "",
                        intensity = 2,
                        interactionOptions = listOf(
                            HighlightOption("哈哈"),
                            HighlightOption("太会了"),
                            HighlightOption("笑死")
                        ),
                        stats = null
                    ),
                    activeInteractionEnabled = true,
                    interactionClickCountByHighlightId = mapOf("preview-quick" to 0)
                )
            )
        )
    }
}

@Composable
private fun PlayerPreviewShell(
    uiState: PlayerScreenUiState
) {
    var danmakuInput by remember { mutableStateOf("") }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF111111))
        )

        Text(
            text = "选集",
            color = Color.White.copy(alpha = 0.84f),
            style = MaterialTheme.typography.labelLarge,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(horizontal = 16.dp, vertical = 20.dp)
        )

        PreviewSideActions(
            isFavorite = uiState.social.isFavorite,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 12.dp, bottom = 200.dp)
        )

        PreviewPlayerBottomBar(
            episodeTitle = uiState.meta.currentEpisode?.title ?: "",
            episodeSummary = uiState.meta.currentEpisode?.summary ?: "",
            danmakuEnabled = uiState.social.danmakuEnabled,
            danmakuInput = danmakuInput,
            playbackState = uiState.playback,
            onDanmakuEnabledChange = {},
            onDanmakuInputChange = { danmakuInput = it },
            onDanmakuSend = {},
            modifier = Modifier
                .align(Alignment.BottomStart)
                .fillMaxWidth()
        )

        if (uiState.social.activeDanmakuMessages.isNotEmpty()) {
            PreviewDanmakuOverlay(
                messages = uiState.social.activeDanmakuMessages,
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = PREVIEW_DANMAKU_TOP_PADDING)
                    .fillMaxWidth()
            )
        }

        HighlightOverlay(
            highlight = uiState.highlight.activeHighlight,
            interactionEnabled = uiState.highlight.activeInteractionEnabled,
            interactionClickCount = uiState.highlight.interactionClickCountByHighlightId[
                uiState.highlight.activeHighlight?.id
            ] ?: 0,
            onInteractionClick = { _, _ -> },
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 78.dp)
        )
    }
}

@Composable
private fun PreviewSideActions(
    isFavorite: Boolean,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        PreviewSideActionChip(
            label = if (isFavorite) "已收藏" else "收藏"
        )
        PreviewSideActionChip(
            label = "评论"
        )
    }
}

@Composable
private fun PreviewPlayerBottomBar(
    episodeTitle: String,
    episodeSummary: String,
    danmakuEnabled: Boolean,
    danmakuInput: String,
    playbackState: PlaybackUiState,
    modifier: Modifier = Modifier,
    onDanmakuEnabledChange: (Boolean) -> Unit = {},
    onDanmakuInputChange: (String) -> Unit = {},
    onDanmakuSend: () -> Unit = {}
) {
    Column(
        modifier = modifier.padding(start = 16.dp, end = 16.dp, bottom = 6.dp)
    ) {
        Text(
            text = episodeTitle,
            style = MaterialTheme.typography.headlineLarge,
            color = Color.White
        )
        if (episodeSummary.isNotEmpty()) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = episodeSummary,
                style = MaterialTheme.typography.bodyLarge,
                color = Color.White.copy(alpha = 0.78f),
                maxLines = 1
            )
        }
        Spacer(modifier = Modifier.height(10.dp))
        PreviewDanmakuComposer(
            enabled = danmakuEnabled,
            input = danmakuInput,
            onEnabledChange = onDanmakuEnabledChange,
            onInputChange = onDanmakuInputChange,
            onSend = onDanmakuSend,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        )
        Spacer(modifier = Modifier.height(8.dp))
        PreviewPlaybackBar(
            progress = playbackState.currentPositionMs,
            durationMs = playbackState.durationMs
        )
    }
}

@Composable
private fun PreviewDanmakuComposer(
    enabled: Boolean,
    input: String,
    onEnabledChange: (Boolean) -> Unit,
    onInputChange: (String) -> Unit,
    onSend: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth(if (enabled) 0.88f else 0.38f),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        PreviewDanmakuActionChip(
            text = if (enabled) "弹幕开" else "弹幕关",
            marker = "弹",
            active = enabled,
            emphasized = false,
            modifier = Modifier.widthIn(min = 92.dp)
        )
        if (enabled) {
            BasicTextField(
                value = input,
                onValueChange = onInputChange,
                modifier = Modifier
                    .weight(1f)
                    .height(PREVIEW_DANMAKU_COMPOSER_HEIGHT)
                    .background(Color.Black.copy(alpha = 0.55f), CircleShape)
                    .padding(horizontal = 12.dp),
                singleLine = true,
                textStyle = MaterialTheme.typography.bodySmall.copy(
                    fontSize = 12.sp,
                    color = Color.White
                ),
                decorationBox = { innerTextField ->
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.CenterStart
                    ) {
                        if (input.isEmpty()) {
                            Text(
                                text = "说点什么",
                                color = Color.White.copy(alpha = 0.42f),
                                style = MaterialTheme.typography.bodySmall.copy(fontSize = 12.sp)
                            )
                        }
                        innerTextField()
                    }
                }
            )
            PreviewDanmakuActionChip(
                text = null,
                marker = "发",
                active = input.isNotBlank(),
                emphasized = true,
                modifier = Modifier.widthIn(min = PREVIEW_DANMAKU_COMPOSER_HEIGHT)
            )
        }
    }
}

@Composable
private fun PreviewDanmakuActionChip(
    text: String?,
    marker: String,
    active: Boolean,
    emphasized: Boolean,
    modifier: Modifier = Modifier
) {
    val backgroundColor = when {
        emphasized && active -> Color(0xFF74A8FF)
        emphasized -> Color.White.copy(alpha = 0.16f)
        active -> Color(0xFF1F2D48).copy(alpha = 0.92f)
        else -> Color.Black.copy(alpha = 0.46f)
    }
    val borderColor = when {
        emphasized && active -> Color.White.copy(alpha = 0.18f)
        emphasized -> Color.White.copy(alpha = 0.18f)
        active -> Color(0xFF8CB9FF).copy(alpha = 0.42f)
        else -> Color.White.copy(alpha = 0.12f)
    }
    val contentColor = if (emphasized && active) Color(0xFF102347) else Color.White

    Row(
        modifier = modifier
            .height(PREVIEW_DANMAKU_COMPOSER_HEIGHT)
            .background(backgroundColor, CircleShape)
            .border(1.dp, borderColor, CircleShape)
            .padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Box(
            modifier = Modifier
                .size(16.dp)
                .background(contentColor.copy(alpha = 0.14f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = marker,
                style = MaterialTheme.typography.labelSmall,
                color = contentColor
            )
        }
        if (text != null) {
            Text(
                text = text,
                style = MaterialTheme.typography.labelLarge.copy(fontSize = 12.sp),
                color = contentColor,
                maxLines = 1
            )
        }
    }
}

@Composable
private fun PreviewPlaybackBar(
    progress: Long,
    durationMs: Long,
    modifier: Modifier = Modifier
) {
    val ratio = if (durationMs > 0) {
        progress.toFloat() / durationMs.toFloat()
    } else {
        0f
    }.coerceIn(0f, 1f)

    Column(modifier = modifier.fillMaxWidth()) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(4.dp)
                .background(Color.White.copy(alpha = 0.18f), RoundedCornerShape(999.dp))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(ratio)
                    .background(Color.White, RoundedCornerShape(999.dp))
            )
        }
        Spacer(modifier = Modifier.height(6.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = formatPreviewTime(progress),
                color = Color.White.copy(alpha = 0.86f),
                style = MaterialTheme.typography.labelSmall
            )
            Text(
                text = formatPreviewTime(durationMs),
                color = Color.White.copy(alpha = 0.56f),
                style = MaterialTheme.typography.labelSmall
            )
        }
    }
}

private fun formatPreviewTime(timeMs: Long): String {
    val totalSeconds = (timeMs / 1000L).coerceAtLeast(0L)
    val minutes = totalSeconds / 60L
    val seconds = totalSeconds % 60L
    return "%02d:%02d".format(minutes, seconds)
}

@Composable
private fun PreviewSideActionChip(
    label: String
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .background(Color.Black.copy(alpha = 0.4f), CircleShape)
                .border(1.dp, Color.White.copy(alpha = 0.16f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = label.take(1),
                color = Color.White,
                style = MaterialTheme.typography.labelLarge
            )
        }
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = Color.White,
            modifier = Modifier.padding(top = 4.dp)
        )
    }
}

@Composable
private fun PreviewDanmakuOverlay(
    messages: List<PlayerDanmakuEntry>,
    modifier: Modifier = Modifier
) {
    BoxWithConstraints(modifier = modifier) {
        val screenWidthPx = constraints.maxWidth.toFloat()
        messages.forEachIndexed { index, danmaku ->
            PreviewDanmakuItem(
                text = danmaku.content,
                trackIndex = index,
                screenWidthPx = screenWidthPx
            )
        }
    }
}

@Composable
private fun PreviewDanmakuItem(
    text: String,
    trackIndex: Int,
    screenWidthPx: Float
) {
    var started by remember(text) { mutableStateOf(false) }
    var itemWidthPx by remember(text) { mutableStateOf(0) }
    val density = LocalDensity.current

    LaunchedEffect(text) {
        started = true
    }

    val translationX by animateFloatAsState(
        targetValue = if (started) -itemWidthPx.toFloat() else screenWidthPx,
        animationSpec = tween(durationMillis = 5200, easing = LinearEasing),
        label = "preview_danmaku_translation"
    )

    Text(
        text = text,
        style = MaterialTheme.typography.bodyLarge.copy(fontSize = PREVIEW_DANMAKU_FONT_SIZE),
        color = Color.White,
        maxLines = 1,
        modifier = Modifier
            .onSizeChanged { itemWidthPx = it.width }
            .offset {
                IntOffset(
                    x = translationX.toInt(),
                    y = with(density) { (PREVIEW_DANMAKU_TRACK_GAP * trackIndex).roundToPx() }
                )
            }
    )
}
