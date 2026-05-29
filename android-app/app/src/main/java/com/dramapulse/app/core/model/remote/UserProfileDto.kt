package com.dramapulse.app.core.model.remote

import kotlinx.serialization.Serializable

@Serializable
data class UserProfileDto(
    val userId: String = "",
    val nickname: String = "",
    val bio: String = "",
    val avatarUrl: String? = null
)

@Serializable
data class UpdateUserProfileRequest(
    val nickname: String,
    val bio: String,
    val avatarUrl: String? = null
)
