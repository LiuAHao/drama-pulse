package com.dramapulse.app.ui.preview

import com.dramapulse.app.core.data.PlayerCommentEntry
import com.dramapulse.app.core.data.PlayerDanmakuEntry
import com.dramapulse.app.core.model.ContinueWatchingModel
import com.dramapulse.app.core.model.DramaCardModel
import com.dramapulse.app.core.model.EpisodeModel
import com.dramapulse.app.core.player.PlaybackState
import com.dramapulse.app.core.player.PlaybackUiState
import com.dramapulse.app.feature.drama_list.DramaListUiState
import com.dramapulse.app.feature.drama_list.ScreenState
import com.dramapulse.app.feature.player.OverlayUiState
import com.dramapulse.app.feature.player.PlayerMetaState
import com.dramapulse.app.feature.player.PlayerScreenState
import com.dramapulse.app.feature.player.PlayerScreenUiState
import com.dramapulse.app.feature.player.PlayerSocialUiState
import com.dramapulse.app.feature.profile.ProfileScreenState
import com.dramapulse.app.feature.profile.ProfileSection
import com.dramapulse.app.feature.profile.ProfileUiState

object PreviewData {

    val drama1 = DramaCardModel(
        id = "drama-1",
        title = "荒年全村啃树皮，我有系统满仓肉",
        description = "荒年逆袭与生存反击并行的高热短剧",
        coverUrl = "",
        mainGenre = "逆袭",
        tags = listOf("荒年", "系统", "逆袭"),
        isFeatured = true,
        heat = 3935
    )

    val drama2 = DramaCardModel(
        id = "drama-2",
        title = "撕夜",
        description = "都市情绪拉扯与反转推进并行",
        coverUrl = "",
        mainGenre = "都市",
        tags = listOf("都市", "情感", "反转"),
        isFeatured = false,
        heat = 3016
    )

    val drama3 = DramaCardModel(
        id = "drama-3",
        title = "我真没想重生啊",
        description = "强爽点节奏下的重生系短剧",
        coverUrl = "",
        mainGenre = "爽剧",
        tags = listOf("重生", "逆袭"),
        isFeatured = false,
        heat = 2784
    )

    val episodes = listOf(
        EpisodeModel(
            id = "ep-1", dramaId = "drama-1", episodeNo = 1,
            title = "第1集：起点", videoUrl = "", durationMs = 180_000,
            summary = "故事的开始", isFinalEpisode = false, hasBranch = false
        ),
        EpisodeModel(
            id = "ep-2", dramaId = "drama-1", episodeNo = 2,
            title = "第2集：转折", videoUrl = "", durationMs = 200_000,
            summary = "剧情转折", isFinalEpisode = false, hasBranch = false
        ),
        EpisodeModel(
            id = "ep-3", dramaId = "drama-1", episodeNo = 3,
            title = "第3集：终章", videoUrl = "", durationMs = 220_000,
            summary = "最终章", isFinalEpisode = true, hasBranch = true
        )
    )

    val continueWatching = ContinueWatchingModel(
        drama = drama1,
        episode = episodes[1],
        progressMs = 78_000
    )

    val dramaListState = DramaListUiState(
        screenState = ScreenState.CONTENT,
        featured = listOf(drama1),
        alternatives = listOf(drama2, drama3),
        continueWatching = continueWatching
    )

    val profileState = ProfileUiState(
        screenState = ProfileScreenState.CONTENT,
        nickname = "剧迷用户26667294",
        avatarUrl = null,
        watchCount = 12,
        favoriteCount = 5,
        branchCount = 3,
        selectedSection = ProfileSection.HISTORY,
        dramas = emptyList()
    )

    val profileStateEmpty = profileState.copy(
        screenState = ProfileScreenState.EMPTY,
        dramas = emptyList()
    )

    val playerMeta = PlayerMetaState(
        dramaId = "drama-1",
        dramaTitle = "荒年全村啃树皮，我有系统满仓肉",
        episodes = episodes,
        currentEpisode = episodes[1],
        currentEpisodeIndex = 1,
        resumePositionMs = 0L
    )

    val playbackPlaying = PlaybackUiState(
        state = PlaybackState.PLAYING,
        currentPositionMs = 45_000,
        durationMs = 200_000,
        bufferedPositionMs = 120_000
    )

    val playbackPaused = PlaybackUiState(
        state = PlaybackState.PAUSED,
        currentPositionMs = 45_000,
        durationMs = 200_000,
        bufferedPositionMs = 120_000
    )

    val playerSocial = PlayerSocialUiState(
        isFavorite = true,
        comments = listOf(
            PlayerCommentEntry("c1", "太好看了！", "刚刚"),
            PlayerCommentEntry("c2", "剧情好反转", "5分钟前")
        ),
        danmakuEnabled = true,
        danmakuMessages = listOf(
            PlayerDanmakuEntry("d1", "高能预警！", createdAtEpochMs = 1L, triggerPositionMs = 43_000L),
            PlayerDanmakuEntry("d2", "来了来了", createdAtEpochMs = 2L, triggerPositionMs = 45_000L)
        ),
        activeDanmakuMessages = listOf(
            PlayerDanmakuEntry("d1", "高能预警！", createdAtEpochMs = 1L, triggerPositionMs = 43_000L),
            PlayerDanmakuEntry("d2", "来了来了", createdAtEpochMs = 2L, triggerPositionMs = 45_000L)
        )
    )

    val playerState = PlayerScreenUiState(
        screenState = PlayerScreenState.READY,
        meta = playerMeta,
        playback = playbackPlaying,
        social = playerSocial,
        overlay = OverlayUiState()
    )
}
