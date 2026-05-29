package com.dramapulse.app.feature.profile

import android.content.SharedPreferences

class ProfileSettingsRepository(
    private val sharedPreferences: SharedPreferences
) {
    fun getNickname(): String = sharedPreferences.getString(KEY_NICKNAME, DEFAULT_NICKNAME) ?: DEFAULT_NICKNAME

    fun getBio(): String = sharedPreferences.getString(KEY_BIO, DEFAULT_BIO) ?: DEFAULT_BIO

    fun getAvatarUrl(): String? = sharedPreferences.getString(KEY_AVATAR_URL, null)

    fun saveProfile(
        nickname: String,
        bio: String,
        avatarUrl: String? = null
    ) {
        sharedPreferences.edit()
            .putString(KEY_NICKNAME, nickname)
            .putString(KEY_BIO, bio)
            .putString(KEY_AVATAR_URL, avatarUrl)
            .apply()
    }

    companion object {
        private const val KEY_NICKNAME = "profile_nickname"
        private const val KEY_BIO = "profile_bio"
        private const val KEY_AVATAR_URL = "profile_avatar_url"

        private const val DEFAULT_NICKNAME = "剧迷用户26667294"
        private const val DEFAULT_BIO = "爱看反转，也爱看上头瞬间"
    }
}
