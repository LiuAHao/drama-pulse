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

    @GET("/users/{userId}/branch-tasks")
    suspend fun getUserBranchTasks(
        @Path("userId") userId: String
    ): ApiResponse<List<BranchTaskDto>>

    // Watch Progress
    @GET("/users/{userId}/watch-progress")
    suspend fun getWatchProgress(@Path("userId") userId: String): ApiResponse<List<WatchProgressDto>>

    @POST("/users/{userId}/watch-progress")
    suspend fun upsertWatchProgress(
        @Path("userId") userId: String,
        @Body request: UpsertWatchProgressRequest
    ): ApiResponse<WatchProgressDto>

    // User Profile
    @GET("/users/{userId}/profile")
    suspend fun getUserProfile(
        @Path("userId") userId: String
    ): ApiResponse<UserProfileStatsDto>

    @PUT("/users/{userId}/profile")
    suspend fun updateUserProfile(
        @Path("userId") userId: String,
        @Body request: UpdateUserProfileRequest
    ): ApiResponse<UserProfileDto>

    @GET("/users/{userId}/favorites")
    suspend fun getFavoriteDramaIds(
        @Path("userId") userId: String
    ): ApiResponse<FavoriteDramaListDto>

    @PUT("/users/{userId}/favorites/{dramaId}")
    suspend fun updateFavoriteDrama(
        @Path("userId") userId: String,
        @Path("dramaId") dramaId: String,
        @Body request: UpdateFavoriteRequest
    ): ApiResponse<UpdateFavoriteResponse>

    @GET("/episodes/{episodeId}/comments")
    suspend fun getPlayerComments(
        @Path("episodeId") episodeId: String
    ): ApiResponse<List<PlayerCommentDto>>

    @POST("/episodes/{episodeId}/comments")
    suspend fun createPlayerComment(
        @Path("episodeId") episodeId: String,
        @Body request: CreatePlayerCommentRequest
    ): ApiResponse<PlayerCommentDto>

    @GET("/episodes/{episodeId}/danmaku")
    suspend fun getDanmakuMessages(
        @Path("episodeId") episodeId: String
    ): ApiResponse<List<DanmakuMessageDto>>

    @POST("/episodes/{episodeId}/danmaku")
    suspend fun createDanmakuMessage(
        @Path("episodeId") episodeId: String,
        @Body request: CreateDanmakuMessageRequest
    ): ApiResponse<DanmakuMessageDto>
}
