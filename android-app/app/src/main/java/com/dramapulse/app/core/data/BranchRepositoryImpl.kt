package com.dramapulse.app.core.data

import com.dramapulse.app.core.model.*
import com.dramapulse.app.core.model.remote.*
import com.dramapulse.app.core.network.DramaPulseApi
import com.dramapulse.app.core.network.unwrap

class BranchRepositoryImpl(
    private val api: DramaPulseApi,
    private val deviceId: String
) : BranchRepository {

    override suspend fun getBranchOptions(episodeId: String): List<BranchOptionModel> {
        return api.getBranchOptions(episodeId).unwrap().map { it.toModel() }
    }

    override suspend fun createBranchTask(episodeId: String, userPrompt: String): BranchTaskModel {
        return api.createBranchTask(
            CreateBranchTaskRequest(
                deviceId = deviceId,
                episodeId = episodeId,
                userPrompt = userPrompt
            )
        ).unwrap().toModel()
    }

    override suspend fun getBranchTask(taskId: String): BranchTaskModel {
        return api.getBranchTask(taskId).unwrap().toModel()
    }

    override suspend fun likeBranchTask(taskId: String): Int {
        return api.likeBranchTask(taskId, BranchLikeRequest(deviceId)).unwrap().likeCount
    }

    override suspend fun createComment(taskId: String, content: String): BranchCommentModel {
        return api.createBranchComment(
            taskId,
            CreateBranchCommentRequest(deviceId = deviceId, content = content)
        ).unwrap().toModel()
    }

    override suspend fun getComments(taskId: String, page: Int, pageSize: Int): BranchCommentPage {
        val response = api.getBranchComments(taskId, page, pageSize).unwrap()
        return BranchCommentPage(
            items = response.items.map { it.toModel() },
            total = response.total,
            page = response.page,
            totalPages = response.totalPages
        )
    }
}
