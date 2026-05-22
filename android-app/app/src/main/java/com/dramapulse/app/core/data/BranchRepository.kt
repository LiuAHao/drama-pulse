package com.dramapulse.app.core.data

import com.dramapulse.app.core.model.*

interface BranchRepository {
    suspend fun getBranchOptions(episodeId: String): List<BranchOptionModel>
    suspend fun createBranchTask(episodeId: String, userPrompt: String): BranchTaskModel
    suspend fun getBranchTask(taskId: String): BranchTaskModel
    suspend fun likeBranchTask(taskId: String): Int
    suspend fun createComment(taskId: String, content: String): BranchCommentModel
    suspend fun getComments(taskId: String, page: Int, pageSize: Int): BranchCommentPage
}

data class BranchCommentPage(
    val items: List<BranchCommentModel>,
    val total: Int,
    val page: Int,
    val totalPages: Int
)
