package com.dramapulse.app.app

object AppRoutes {
    const val DRAMA_LIST = "drama_list"
    const val PLAYER = "player/{dramaId}?episodeId={episodeId}"
    const val BRANCH_RESULT = "branch_result/{episodeId}?mode={mode}&optionId={optionId}"
    const val PROFILE = "profile"
    const val SETTINGS = "settings"
    const val DEBUG_PLAYER = "debug_player/{dramaId}?episodeId={episodeId}"
    const val DEBUG_HIGHLIGHT = "debug_highlight"

    fun playerRoute(dramaId: String, episodeId: String? = null): String {
        return if (episodeId != null) {
            "player/$dramaId?episodeId=$episodeId"
        } else {
            "player/$dramaId"
        }
    }

    fun branchResultRoute(
        episodeId: String,
        mode: String = "options",
        optionId: String? = null
    ): String {
        val optionSegment = optionId?.let { "&optionId=$it" } ?: ""
        return "branch_result/$episodeId?mode=$mode$optionSegment"
    }

    fun debugPlayerRoute(dramaId: String, episodeId: String? = null): String {
        return if (episodeId != null) {
            "debug_player/$dramaId?episodeId=$episodeId"
        } else {
            "debug_player/$dramaId"
        }
    }
}
