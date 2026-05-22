package com.dramapulse.app.core.network

import com.dramapulse.app.core.model.remote.*
import retrofit2.http.*

interface DramaPulseApi {

    // Content
    @GET("/dramas")
    suspend fun getDramas(): ApiResponse<DramaListData>

    @GET("/dramas/{dramaId}/episodes")
    suspend fun getEpisodes(@Path("dramaId") dramaId: String): ApiResponse<List<EpisodeDto>>

    @GET("/episodes/{episodeId}")
    suspend fun getEpisodeDetail(@Path("episodeId") episodeId: String): ApiResponse<EpisodeDto>

    // Highlights
    @GET("/episodes/{episodeId}/highlights")
    suspend fun getHighlights(@Path("episodeId") episodeId: String): ApiResponse<List<HighlightDto>>

    // Interactions
    @POST("/interactions")
    suspend fun createInteraction(@Body request: CreateInteractionRequest): ApiResponse<HighlightStatsDto>

    // Branch
    @GET("/episodes/{episodeId}/branch-options")
    suspend fun getBranchOptions(@Path("episodeId") episodeId: String): ApiResponse<List<BranchOptionDto>>

    @POST("/branch-tasks")
    suspend fun createBranchTask(@Body request: CreateBranchTaskRequest): ApiResponse<BranchTaskDto>

    @GET("/branch-tasks/{taskId}")
    suspend fun getBranchTask(@Path("taskId") taskId: String): ApiResponse<BranchTaskDto>

    @POST("/branch-tasks/{taskId}/likes")
    suspend fun likeBranchTask(
        @Path("taskId") taskId: String,
        @Body request: BranchLikeRequest
    ): ApiResponse<BranchLikeResponse>

    @POST("/branch-tasks/{taskId}/comments")
    suspend fun createBranchComment(
        @Path("taskId") taskId: String,
        @Body request: CreateBranchCommentRequest
    ): ApiResponse<BranchCommentDto>

    @GET("/branch-tasks/{taskId}/comments")
    suspend fun getBranchComments(
        @Path("taskId") taskId: String,
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20
    ): ApiResponse<PaginatedData<BranchCommentDto>>

    // Watch Progress
    @GET("/users/{userId}/watch-progress")
    suspend fun getWatchProgress(@Path("userId") userId: String): ApiResponse<List<WatchProgressDto>>

    @POST("/users/{userId}/watch-progress")
    suspend fun upsertWatchProgress(
        @Path("userId") userId: String,
        @Body request: UpsertWatchProgressRequest
    ): ApiResponse<WatchProgressDto>
}
