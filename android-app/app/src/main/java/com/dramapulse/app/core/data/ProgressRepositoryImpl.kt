package com.dramapulse.app.core.data

import com.dramapulse.app.core.model.remote.UpsertWatchProgressRequest
import com.dramapulse.app.core.network.DramaPulseApi
import com.dramapulse.app.core.network.unwrap

class ProgressRepositoryImpl(
    private val api: DramaPulseApi,
    private val deviceId: String,
    private val userId: String
) : ProgressRepository {

    override suspend fun getWatchProgress(): List<WatchProgressEntry> {
        return api.getWatchProgress(userId).unwrap().map { it.toEntry() }
    }

    override suspend fun saveWatchProgress(episodeId: String, progressMs: Long) {
        api.upsertWatchProgress(
            userId = userId,
            request = UpsertWatchProgressRequest(
                deviceId = deviceId,
                episodeId = episodeId,
                progressMs = progressMs
            )
        ).unwrap()
    }
}
