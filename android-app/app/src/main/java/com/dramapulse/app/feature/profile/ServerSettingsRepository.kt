package com.dramapulse.app.feature.profile

import com.dramapulse.app.core.network.ServerConfigRepository

class ServerSettingsRepository(
    private val serverConfigRepository: ServerConfigRepository
) {
    fun getServerBaseUrl(): String = serverConfigRepository.getDisplayBaseUrl()

    fun saveServerBaseUrl(value: String) {
        serverConfigRepository.saveBaseUrl(value)
    }
}
