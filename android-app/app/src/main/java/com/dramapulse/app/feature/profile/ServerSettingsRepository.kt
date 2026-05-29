package com.dramapulse.app.feature.profile

import com.dramapulse.app.core.network.ServerConfigRepository
import com.dramapulse.app.core.network.toDisplayBaseUrl

class ServerSettingsRepository(
    private val serverConfigRepository: ServerConfigRepository
) {
    fun getServerBaseUrl(): String = serverConfigRepository.getBaseUrlOrNull().toDisplayBaseUrl()

    fun saveServerBaseUrl(value: String) {
        serverConfigRepository.saveBaseUrl(value)
    }
}
