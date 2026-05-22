package com.dramapulse.app.feature.player

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import com.dramapulse.app.core.design.Dimens
import com.dramapulse.app.core.player.ExoPlayerController
import com.dramapulse.app.ui.component.BranchEntryCard
import com.dramapulse.app.ui.component.EpisodeSelectorSheet
import com.dramapulse.app.ui.component.ErrorPanel
import com.dramapulse.app.ui.component.LoadingPanel
import com.dramapulse.app.ui.component.NextEpisodeCard
import com.dramapulse.app.ui.component.PlayerControlBar
import com.dramapulse.app.ui.overlay.HighlightOverlay

@Composable
fun PlayerScreen(
    dramaId: String,
    episodeId: String?,
    viewModel: PlayerViewModel,
    playerController: ExoPlayerController,
    onBack: () -> Unit,
    onNavigateToBranch: (episodeId: String) -> Unit,
    modifier: Modifier = Modifier
) {
    LaunchedEffect(dramaId, episodeId) {
        viewModel.onEvent(PlayerEvent.EnterScreen(dramaId, episodeId))
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
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black)
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

        Box(
            modifier = Modifier
                .matchParentSize()
                .background(
                    Brush.verticalGradient(
                        colorStops = arrayOf(
                            0.0f to Color.Black.copy(alpha = 0.78f),
                            0.16f to Color.Black.copy(alpha = 0.16f),
                            0.42f to Color.Transparent,
                            0.72f to Color.Black.copy(alpha = 0.14f),
                            1.0f to Color.Black.copy(alpha = 0.92f)
                        )
                    )
                )
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.TopCenter)
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.ArrowBack,
                contentDescription = "返回",
                tint = Color.White,
                modifier = Modifier
                    .size(28.dp)
                    .clip(CircleShape)
                    .clickable(onClick = onBack)
                    .padding(2.dp)
            )
            Spacer(modifier = Modifier.weight(1f))
            Text(
                text = uiState.meta.currentEpisode?.title ?: "",
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.weight(1f))
            Icon(
                imageVector = Icons.Default.List,
                contentDescription = "选集",
                tint = Color.White,
                modifier = Modifier
                    .size(28.dp)
                    .clip(CircleShape)
                    .clickable { onEvent(PlayerEvent.ToggleEpisodeSelector) }
                    .padding(2.dp)
            )
        }

        Column(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 12.dp, bottom = 84.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            SideActionButton(icon = Icons.Default.Favorite, label = "收藏", onClick = {})
            SideActionButton(icon = Icons.Default.ChatBubbleOutline, label = "评论", onClick = {})
            SideActionButton(icon = Icons.Default.Share, label = "分享", onClick = {})
        }

        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .fillMaxWidth()
                .padding(start = 16.dp, end = 84.dp, bottom = 6.dp)
        ) {
            Text(
                text = uiState.meta.currentEpisode?.title ?: "",
                style = MaterialTheme.typography.headlineLarge,
                color = Color.White
            )
            if (uiState.meta.currentEpisode?.summary?.isNotEmpty() == true) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = uiState.meta.currentEpisode?.summary ?: "",
                    style = MaterialTheme.typography.bodyLarge,
                    color = Color.White.copy(alpha = 0.78f),
                    maxLines = 1
                )
            }
            Spacer(modifier = Modifier.height(2.dp))
            PlayerControlBar(
                playbackState = uiState.playback,
                onPlay = { onEvent(PlayerEvent.Play) },
                onPause = { onEvent(PlayerEvent.Pause) },
                onSeek = { onEvent(PlayerEvent.SeekTo(it)) },
                onNextEpisode = { onEvent(PlayerEvent.PlayNextEpisode) }
            )
        }

        HighlightOverlay(
            highlight = uiState.highlight.activeHighlight,
            onInteractionClick = { highlightId, text ->
                onEvent(PlayerEvent.OnInteractionClick(highlightId, text))
            },
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 78.dp)
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
    }
}

@Composable
private fun SideActionButton(
    icon: ImageVector,
    label: String,
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
                tint = Color.White,
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
