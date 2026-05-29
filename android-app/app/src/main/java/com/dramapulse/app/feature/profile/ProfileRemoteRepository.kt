package com.dramapulse.app.feature.profile

import com.dramapulse.app.core.data.toCardModel
import com.dramapulse.app.core.model.DramaCardModel
import com.dramapulse.app.core.model.remote.UpdateUserProfileRequest
import com.dramapulse.app.core.model.remote.UserProfileDto
import com.dramapulse.app.core.model.remote.UserProfileStatsDto
import com.dramapulse.app.core.network.DramaPulseApi
import com.dramapulse.app.core.network.unwrap
import com.dramapulse.app.core.util.toEpochMillisOrNow

data class ProfileSectionData(
    val history: List<DramaCardModel> = emptyList(),
    val favorites: List<DramaCardModel> = emptyList(),
    val myBranches: List<DramaCardModel> = emptyList()
)

class ProfileRemoteRepository(
    private val api: DramaPulseApi,
    private val userId: String
) {
    suspend fun getProfile(): UserProfileStatsDto {
        return api.getUserProfile(userId).unwrap()
    }

    suspend fun updateProfile(
        nickname: String,
        bio: String,
        avatarUrl: String? = null
    ): UserProfileDto {
        return api.updateUserProfile(
            userId = userId,
            request = UpdateUserProfileRequest(
                nickname = nickname,
                bio = bio,
                avatarUrl = avatarUrl
            )
        ).unwrap()
    }

    suspend fun getProfileSectionData(): ProfileSectionData {
        val watchProgress = api.getWatchProgress(userId).unwrap()
        val favoriteDramas = api.getFavoriteDramaIds(userId).unwrap().dramas
        val branchTasks = api.getUserBranchTasks(userId).unwrap()

        val history = watchProgress
            .sortedByDescending { it.updatedAt.toEpochMillisOrNow() }
            .mapNotNull { progress ->
                progress.drama?.toCardModel()
            }
            .distinctBy { it.id }

        val favorites = favoriteDramas
            .map { it.toCardModel() }

        val myBranches = branchTasks
            .sortedByDescending { it.createdAt }
            .mapNotNull { task ->
                task.drama?.toCardModel()
            }
            .distinctBy { it.id }

        return ProfileSectionData(
            history = history,
            favorites = favorites,
            myBranches = myBranches
        )
    }
}
