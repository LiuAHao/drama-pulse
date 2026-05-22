package com.dramapulse.app.core.data

import com.dramapulse.app.core.model.*

class FakeContentRepository : ContentRepository {

    override suspend fun getDramas(): DramaListResult {
        return DramaListResult(
            featured = listOf(
                DramaCardModel(
                    id = "drama-1",
                    title = "荒年全村啃树皮，我有系统满仓肉",
                    description = "荒年逆袭与生存反击并行的高热短剧",
                    coverUrl = "",
                    mainGenre = "逆袭",
                    tags = listOf("荒年", "系统", "逆袭"),
                    isFeatured = true,
                    heat = 3935
                )
            ),
            alternatives = listOf(
                DramaCardModel(
                    id = "drama-2",
                    title = "撕夜",
                    description = "都市情绪拉扯与反转推进并行",
                    coverUrl = "",
                    mainGenre = "都市",
                    tags = listOf("都市", "情感", "反转"),
                    isFeatured = false,
                    heat = 3016
                ),
                DramaCardModel(
                    id = "drama-3",
                    title = "我真没想重生啊",
                    description = "强爽点节奏下的重生系短剧",
                    coverUrl = "",
                    mainGenre = "爽剧",
                    tags = listOf("重生", "逆袭"),
                    isFeatured = false,
                    heat = 2784
                )
            ),
            continueWatching = ContinueWatchingModel(
                drama = DramaCardModel(
                    id = "drama-1",
                    title = "荒年全村啃树皮，我有系统满仓肉",
                    description = "荒年逆袭与生存反击并行的高热短剧",
                    coverUrl = "",
                    mainGenre = "逆袭",
                    tags = listOf("荒年", "系统", "逆袭"),
                    isFeatured = true,
                    heat = 3935
                ),
                episode = EpisodeModel(
                    id = "ep-2",
                    dramaId = "drama-1",
                    episodeNo = 2,
                    title = "第2集：系统兑现第一波物资",
                    videoUrl = "",
                    durationMs = 200_000,
                    summary = "村里危机升级，主角第一次公开反击。",
                    isFinalEpisode = false,
                    hasBranch = false
                ),
                progressMs = 78_000
            )
        )
    }

    override suspend fun getEpisodes(dramaId: String): List<EpisodeModel> {
        return listOf(
            EpisodeModel(
                id = "ep-1",
                dramaId = dramaId,
                episodeNo = 1,
                title = "第1集：起点",
                videoUrl = "",
                durationMs = 180_000,
                summary = "故事的开始",
                isFinalEpisode = false,
                hasBranch = false
            ),
            EpisodeModel(
                id = "ep-2",
                dramaId = dramaId,
                episodeNo = 2,
                title = "第2集：转折",
                videoUrl = "",
                durationMs = 200_000,
                summary = "剧情转折",
                isFinalEpisode = false,
                hasBranch = false
            ),
            EpisodeModel(
                id = "ep-3",
                dramaId = dramaId,
                episodeNo = 3,
                title = "第3集：终章",
                videoUrl = "",
                durationMs = 220_000,
                summary = "最终章",
                isFinalEpisode = true,
                hasBranch = true
            )
        )
    }

    override suspend fun getEpisodeDetail(episodeId: String): EpisodeModel {
        return EpisodeModel(
            id = episodeId,
            dramaId = "drama-1",
            episodeNo = 1,
            title = "第1集：起点",
            videoUrl = "",
            durationMs = 180_000,
            summary = "故事的开始",
            isFinalEpisode = false,
            hasBranch = false
        )
    }

    override suspend fun getHighlights(episodeId: String): List<HighlightModel> {
        return listOf(
            HighlightModel(
                id = "hl-1",
                episodeId = episodeId,
                startTimeMs = 15_000,
                endTimeMs = 30_000,
                type = HighlightType.FEEL_GOOD,
                title = "主角觉醒",
                description = "主角意识到自己的潜力",
                intensity = 4,
                templateId = HighlightTemplate.EMOTION_BUTTON,
                interactionOptions = listOf(
                    HighlightOption(text = "太燃了", action = "cheer"),
                    HighlightOption(text = "加油", action = "support")
                ),
                stats = HighlightStatsModel(
                    totalCount = 42,
                    uniqueDeviceCount = 30,
                    heatLevel = 2,
                    topOption = "太燃了"
                )
            ),
            HighlightModel(
                id = "hl-2",
                episodeId = episodeId,
                startTimeMs = 60_000,
                endTimeMs = 75_000,
                type = HighlightType.REVERSAL,
                title = "剧情反转",
                description = "意想不到的发展",
                intensity = 5,
                templateId = HighlightTemplate.VOTE_SIDE,
                interactionOptions = listOf(
                    HighlightOption(text = "震惊", action = "shock"),
                    HighlightOption(text = "意料之中", action = "expected")
                ),
                stats = HighlightStatsModel(
                    totalCount = 88,
                    uniqueDeviceCount = 65,
                    heatLevel = 3,
                    topOption = "震惊"
                )
            )
        )
    }
}
