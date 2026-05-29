package com.dramapulse.app.feature.player

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import android.widget.Toast
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import androidx.compose.ui.viewinterop.AndroidView
import com.dramapulse.app.core.data.PlayerCommentEntry
import com.dramapulse.app.core.data.PlayerDanmakuEntry
import com.dramapulse.app.core.design.Dimens
import com.dramapulse.app.core.player.ExoPlayerController
import com.dramapulse.app.core.player.PlaybackState
import com.dramapulse.app.core.player.PlaybackUiState
import com.dramapulse.app.ui.component.BranchEntryCard
import com.dramapulse.app.ui.component.EpisodeSelectorSheet
import com.dramapulse.app.ui.component.ErrorPanel
import com.dramapulse.app.ui.component.LoadingPanel
import com.dramapulse.app.ui.component.NextEpisodeCard
import com.dramapulse.app.ui.component.PlayerControlBar
import com.dramapulse.app.ui.overlay.HeatHintOverlay
import com.dramapulse.app.ui.overlay.HighlightOverlay

private val FLOATING_DANMAKU_TOP_PADDING = 64.dp
private val FLOATING_DANMAKU_OVERLAY_HEIGHT = 120.dp
private val FLOATING_DANMAKU_TRACK_GAP = 32.dp
private val FLOATING_DANMAKU_FONT_SIZE = 18.sp
private val DANMAKU_COMPOSER_HEIGHT = 38.dp

@Composable
fun PlayerScreen(
    dramaId: String,
    episodeId: String?,
    viewModel: PlayerViewModel,
    playerController: ExoPlayerController,
    onBack: () -> Unit,
    onNavigateToBranch: (episodeId: String) -> Unit,
    forceReloadOnEnter: Boolean = false,
    modifier: Modifier = Modifier
) {
    LaunchedEffect(dramaId, episodeId) {
        // Highlights come from backend, but each time we re-enter the playback surface
        // we re-arm local trigger state so the current episode can trigger again.
        viewModel.resetHighlightTriggersForCurrentEpisode()
        viewModel.onEvent(PlayerEvent.EnterScreen(dramaId, episodeId, forceReload = forceReloadOnEnter))
    }

    DisposableEffect(dramaId, episodeId) {
        onDispose {
            viewModel.onLeavePlaybackSurface()
        }
    }

    val uiState by viewModel.uiState.collectAsState()

    when (uiState.screenState) {
        PlayerScreenState.IDLE, PlayerScreenState.LOADING -> LoadingPanel(modifier)
        PlayerScreenState.ERROR -> ErrorPanel(
            message = uiState.errorMessage ?: "加载失败",
            onRetry = { viewModel.onEvent(PlayerEvent.EnterScreen(dramaId, episodeId)) },
            modifier = modifier
        )
        PlayerScreenState.READY -> PlayerContent(
            uiState = uiState,
            playerController = playerController,
            onEvent = viewModel::onEvent,
            onBack = onBack,
            onNavigateToBranch = onNavigateToBranch,
            modifier = modifier
        )
    }
}

@Composable
private fun PlayerContent(
    uiState: PlayerScreenUiState,
    playerController: ExoPlayerController,
    onEvent: (PlayerEvent) -> Unit,
    onBack: () -> Unit,
    onNavigateToBranch: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val swipeThresholdPx = 120f
    val overlayShowing =
        uiState.overlay.showEpisodeSelector || uiState.overlay.showNextEpisodeCard || uiState.overlay.showBranchEntry || uiState.overlay.showCommentsSheet
    var danmakuInput by remember { mutableStateOf("") }
    var commentInput by remember { mutableStateOf("") }

    LaunchedEffect(uiState.transientMessage?.id) {
        val message = uiState.transientMessage ?: return@LaunchedEffect
        Toast.makeText(context, message.text, Toast.LENGTH_SHORT).show()
        onEvent(PlayerEvent.ConsumeTransientMessage(message.id))
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black)
            .pointerInput(uiState.playback.isPlaying, overlayShowing) {
                detectTapGestures(
                    onTap = {
                        if (!overlayShowing) {
                            if (uiState.playback.isPlaying) {
                                onEvent(PlayerEvent.Pause)
                            } else {
                                onEvent(PlayerEvent.Play)
                            }
                        }
                    }
                )
            }
            .pointerInput(
                uiState.meta.currentEpisodeIndex,
                uiState.meta.episodes.size,
                overlayShowing
            ) {
                var accumulatedDrag = 0f
                detectVerticalDragGestures(
                    onDragStart = { accumulatedDrag = 0f },
                    onVerticalDrag = { change, dragAmount ->
                        if (!overlayShowing) {
                            change.consume()
                            accumulatedDrag += dragAmount
                        }
                    },
                    onDragEnd = {
                        if (!overlayShowing) {
                            when (
                                resolveVerticalSwipeAction(
                                    accumulatedDrag = accumulatedDrag,
                                    thresholdPx = swipeThresholdPx,
                                    currentEpisodeIndex = uiState.meta.currentEpisodeIndex,
                                    episodeCount = uiState.meta.episodes.size
                                )
                            ) {
                                VerticalSwipeAction.PREVIOUS_EPISODE -> onEvent(PlayerEvent.PlayPreviousEpisode)
                                VerticalSwipeAction.NEXT_EPISODE -> onEvent(PlayerEvent.PlayNextEpisode)
                                VerticalSwipeAction.REACHED_START -> Toast.makeText(context, "已经是第一集", Toast.LENGTH_SHORT).show()
                                VerticalSwipeAction.REACHED_END -> Toast.makeText(context, "已经是最后一集", Toast.LENGTH_SHORT).show()
                                VerticalSwipeAction.NONE -> Unit
                            }
                        }
                    }
                )
            }
    ) {
        val exoPlayer = playerController.player
        if (exoPlayer != null) {
            AndroidView(
                factory = { ctx ->
                    PlayerView(ctx).apply {
                        player = exoPlayer
                        useController = false
                        resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                        setShutterBackgroundColor(android.graphics.Color.BLACK)
                    }
                },
                update = { view ->
                    view.player = exoPlayer
                    view.resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                },
                modifier = Modifier.fillMaxSize()
            )
        }

        PlayerTopBar(
            dramaTitle = uiState.meta.dramaTitle,
            episodeLabel = uiState.meta.currentEpisode?.let { "第${it.episodeNo}集" }.orEmpty(),
            onBack = onBack,
            onEpisodeSelectorClick = { onEvent(PlayerEvent.ToggleEpisodeSelector) },
            modifier = Modifier
                .align(Alignment.TopCenter)
                .statusBarsPadding()
                .padding(horizontal = 12.dp, vertical = 8.dp)
        )

        // Right side action buttons (above bottom info area)
        PlayerSideActions(
            isFavorite = uiState.social.isFavorite,
            onFavoriteClick = { onEvent(PlayerEvent.ToggleFavorite) },
            onCommentClick = { onEvent(PlayerEvent.ToggleCommentsSheet) },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 12.dp, bottom = 200.dp)
        )

        // Bottom info area
        PlayerBottomBar(
            episodeTitle = uiState.meta.currentEpisode?.title ?: "",
            episodeSummary = uiState.meta.currentEpisode?.summary ?: "",
            danmakuEnabled = uiState.social.danmakuEnabled,
            danmakuInput = danmakuInput,
            onDanmakuEnabledChange = { onEvent(PlayerEvent.SetDanmakuEnabled(it)) },
            onDanmakuInputChange = { danmakuInput = it },
            onDanmakuSend = {
                if (danmakuInput.isNotBlank()) {
                    onEvent(PlayerEvent.SubmitDanmaku(danmakuInput))
                    danmakuInput = ""
                }
            },
            playbackState = uiState.playback,
            onSeek = { onEvent(PlayerEvent.SeekTo(it)) },
            modifier = Modifier
                .align(Alignment.BottomStart)
                .fillMaxWidth()
        )

        // Danmaku floating messages
        if (uiState.social.danmakuEnabled && uiState.social.activeDanmakuMessages.isNotEmpty()) {
            DanmakuOverlay(
                messages = uiState.social.activeDanmakuMessages,
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = FLOATING_DANMAKU_TOP_PADDING)
                    .fillMaxWidth()
            )
        }

        HighlightOverlay(
            highlight = uiState.highlight.activeHighlight,
            interactionEnabled = uiState.highlight.activeInteractionEnabled,
            interactionClickCount = uiState.highlight.interactionClickCountByHighlightId[
                uiState.highlight.activeHighlight?.id
            ] ?: 0,
            onInteractionClick = { highlightId, text ->
                onEvent(PlayerEvent.OnInteractionClick(highlightId, text))
            },
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 78.dp)
        )

        HeatHintOverlay(
            highlight = uiState.highlight.activeHighlight,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .statusBarsPadding()
                .padding(top = 60.dp, end = 12.dp)
        )

        if (uiState.playback.isBuffering) {
            LoadingPanel(
                modifier = Modifier
                    .size(48.dp)
                    .align(Alignment.Center)
            )
        }

        if (uiState.playback.hasError) {
            ErrorPanel(
                message = uiState.playback.errorMessage ?: "播放失败",
                onRetry = {
                    val episode = uiState.meta.currentEpisode
                    if (episode != null) {
                        playerController.attach(episode.videoUrl, uiState.meta.resumePositionMs)
                        playerController.play()
                    }
                },
                modifier = Modifier
                    .size(220.dp)
                    .align(Alignment.Center)
            )
        }

        if (uiState.overlay.showEpisodeSelector) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.5f))
                    .clickable { onEvent(PlayerEvent.ToggleEpisodeSelector) },
                contentAlignment = Alignment.BottomCenter
            ) {
                EpisodeSelectorSheet(
                    modifier = Modifier.padding(
                        start = 12.dp,
                        end = 12.dp,
                        bottom = Dimens.BottomNavHeight + 8.dp
                    ),
                    episodes = uiState.meta.episodes,
                    currentIndex = uiState.meta.currentEpisodeIndex,
                    onSelect = { onEvent(PlayerEvent.SelectEpisode(it)) },
                    onDismiss = { onEvent(PlayerEvent.ToggleEpisodeSelector) }
                )
            }
        }

        if (uiState.overlay.showNextEpisodeCard) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.5f)),
                contentAlignment = Alignment.BottomCenter
            ) {
                val nextIndex = uiState.meta.currentEpisodeIndex + 1
                val nextEpisode = uiState.meta.episodes.getOrNull(nextIndex)
                NextEpisodeCard(
                    nextEpisode = nextEpisode,
                    onPlayNext = { onEvent(PlayerEvent.PlayNextEpisode) },
                    onDismiss = { onEvent(PlayerEvent.DismissNextEpisode) }
                )
            }
        }

        if (uiState.overlay.showBranchEntry) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.5f)),
                contentAlignment = Alignment.BottomCenter
            ) {
                BranchEntryCard(
                    onGoToBranch = {
                        val epId = uiState.meta.currentEpisode?.id
                        if (epId != null) {
                            onNavigateToBranch(epId)
                        }
                    },
                    onDismiss = { onEvent(PlayerEvent.DismissBranchEntry) }
                )
            }
        }

        if (uiState.overlay.showCommentsSheet) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.5f))
                    .clickable { onEvent(PlayerEvent.ToggleCommentsSheet) },
                contentAlignment = Alignment.BottomCenter
            ) {
                CommentsSheet(
                    comments = uiState.social.comments,
                    input = commentInput,
                    onInputChange = { commentInput = it },
                    onDismiss = { onEvent(PlayerEvent.ToggleCommentsSheet) },
                    onSend = {
                        if (commentInput.isNotBlank()) {
                            onEvent(PlayerEvent.SubmitComment(commentInput))
                            commentInput = ""
                        }
                    }
                )
            }
        }
    }
}

@Composable
private fun PlayerTopBar(
    dramaTitle: String,
    episodeLabel: String,
    onBack: () -> Unit,
    onEpisodeSelectorClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
            contentDescription = "返回",
            tint = Color.White,
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .clickable { onBack() }
                .padding(4.dp)
        )
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 12.dp)
        ) {
            if (dramaTitle.isNotBlank()) {
                Text(
                    text = dramaTitle,
                    color = Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    style = MaterialTheme.typography.titleMedium
                )
            }
            if (episodeLabel.isNotBlank()) {
                Text(
                    text = episodeLabel,
                    color = Color.White.copy(alpha = 0.72f),
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
        Icon(
            imageVector = Icons.AutoMirrored.Default.List,
            contentDescription = "选集",
            tint = Color.White,
            modifier = Modifier
                .size(28.dp)
                .clip(CircleShape)
                .clickable { onEpisodeSelectorClick() }
                .padding(2.dp)
        )
    }
}

@Composable
fun PlayerSideActions(
    isFavorite: Boolean,
    onFavoriteClick: () -> Unit,
    onCommentClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        SideActionButton(
            icon = if (isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
            label = if (isFavorite) "已收藏" else "收藏",
            iconTint = if (isFavorite) Color(0xFFFF6B6B) else Color.White,
            onClick = onFavoriteClick
        )
        SideActionButton(
            icon = Icons.Default.ChatBubbleOutline,
            label = "评论",
            onClick = onCommentClick
        )
    }
}

@Composable
fun PlayerBottomBar(
    episodeTitle: String,
    episodeSummary: String,
    danmakuEnabled: Boolean,
    danmakuInput: String,
    onDanmakuEnabledChange: (Boolean) -> Unit,
    onDanmakuInputChange: (String) -> Unit,
    onDanmakuSend: () -> Unit,
    playbackState: PlaybackUiState,
    onSeek: (Long) -> Unit,
    modifier: Modifier = Modifier
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
        DanmakuComposer(
            enabled = danmakuEnabled,
            input = danmakuInput,
            onEnabledChange = onDanmakuEnabledChange,
            onInputChange = onDanmakuInputChange,
            onSend = onDanmakuSend,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        )
        Spacer(modifier = Modifier.height(8.dp))
        PlayerControlBar(
            playbackState = playbackState,
            onSeek = onSeek,
        )
    }
}

@Composable
private fun SideActionButton(
    icon: ImageVector,
    label: String,
    iconTint: Color = Color.White,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier.clickable(onClick = onClick)
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .background(Color.Black.copy(alpha = 0.4f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = iconTint,
                modifier = Modifier.size(24.dp)
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = Color.White
        )
    }
}

@Composable
private fun DanmakuComposer(
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
        DanmakuActionChip(
            text = if (enabled) "弹幕开" else "弹幕关",
            contentDescription = if (enabled) "关闭弹幕" else "开启弹幕",
            icon = Icons.Default.ChatBubbleOutline,
            active = enabled,
            emphasized = false,
            onClick = { onEnabledChange(!enabled) },
            modifier = Modifier.widthIn(min = 92.dp)
        )
        if (enabled) {
            BasicTextField(
                value = input,
                onValueChange = onInputChange,
                modifier = Modifier
                    .weight(1f)
                    .height(DANMAKU_COMPOSER_HEIGHT)
                    .clip(CircleShape)
                    .background(Color.Black.copy(alpha = 0.55f))
                    .padding(horizontal = 12.dp, vertical = 0.dp),
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
                                style = MaterialTheme.typography.bodySmall.copy(fontSize = 12.sp),
                                color = Color.White.copy(alpha = 0.36f)
                            )
                        }
                        innerTextField()
                    }
                }
            )
            DanmakuActionChip(
                text = null,
                contentDescription = "发送",
                icon = Icons.AutoMirrored.Default.Send,
                active = input.isNotBlank(),
                emphasized = true,
                onClick = onSend,
                modifier = Modifier.widthIn(min = DANMAKU_COMPOSER_HEIGHT)
            )
        }
    }
}

@Composable
private fun DanmakuActionChip(
    text: String?,
    contentDescription: String,
    icon: ImageVector,
    active: Boolean,
    emphasized: Boolean,
    onClick: () -> Unit,
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
            .height(DANMAKU_COMPOSER_HEIGHT)
            .clip(CircleShape)
            .background(backgroundColor)
            .border(width = 1.dp, color = borderColor, shape = CircleShape)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = contentColor,
            modifier = Modifier.size(15.dp)
        )
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
private fun CommentsSheet(
    comments: List<PlayerCommentEntry>,
    input: String,
    onInputChange: (String) -> Unit,
    onDismiss: () -> Unit,
    onSend: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(androidx.compose.foundation.shape.RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
            .background(Color(0xFF121212))
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "评论",
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White,
                modifier = Modifier.weight(1f)
            )
            Text(
                text = "关闭",
                color = Color.White.copy(alpha = 0.7f),
                modifier = Modifier.clickable(onClick = onDismiss)
            )
        }
        Spacer(modifier = Modifier.height(12.dp))
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .height(220.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            if (comments.isEmpty()) {
                Text("还没有评论，发一条吧", color = Color.White.copy(alpha = 0.7f))
            } else {
                comments.take(6).forEach { comment ->
                    Column {
                        Text(comment.content, color = Color.White, style = MaterialTheme.typography.bodyMedium)
                        Text(comment.createdAtLabel, color = Color.White.copy(alpha = 0.5f), style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedTextField(
                value = input,
                onValueChange = onInputChange,
                modifier = Modifier.weight(1f),
                singleLine = true,
                placeholder = { Text("写评论", color = Color.White.copy(alpha = 0.5f)) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Color.Black.copy(alpha = 0.35f),
                    unfocusedContainerColor = Color.Black.copy(alpha = 0.35f),
                    focusedBorderColor = Color.Transparent,
                    unfocusedBorderColor = Color.Transparent,
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White
                )
            )
            Text(
                text = "发送",
                color = Color.White,
                style = MaterialTheme.typography.labelLarge,
                modifier = Modifier
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.16f))
                    .clickable(onClick = onSend)
                    .padding(horizontal = 14.dp, vertical = 10.dp)
            )
        }
    }
}

@Composable
private fun DanmakuOverlay(
    messages: List<PlayerDanmakuEntry>,
    modifier: Modifier = Modifier
) {
    BoxWithConstraints(modifier = modifier.height(FLOATING_DANMAKU_OVERLAY_HEIGHT)) {
        val screenWidthPx = constraints.maxWidth.toFloat()
        messages.forEachIndexed { index: Int, danmaku: PlayerDanmakuEntry ->
            DanmakuItem(
                text = danmaku.content,
                trackIndex = index,
                screenWidthPx = screenWidthPx
            )
        }
    }
}

@Composable
private fun DanmakuItem(
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
        label = "danmaku_translation"
    )

    Text(
        text = text,
        style = MaterialTheme.typography.bodyLarge.copy(fontSize = FLOATING_DANMAKU_FONT_SIZE),
        color = Color.White,
        maxLines = 1,
        modifier = Modifier
            .onSizeChanged { itemWidthPx = it.width }
            .offset {
                IntOffset(
                    x = translationX.toInt(),
                    y = with(density) { (FLOATING_DANMAKU_TRACK_GAP * trackIndex).roundToPx() }
                )
            }
    )
}
