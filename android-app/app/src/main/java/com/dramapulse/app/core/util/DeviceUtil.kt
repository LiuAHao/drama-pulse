package com.dramapulse.app.core.util

import android.content.Context
import java.util.UUID

object DeviceUtil {

    private const val PREF_NAME = "drama_pulse_prefs"
    private const val KEY_DEVICE_ID = "device_id"

    fun getOrCreateDeviceId(context: Context): String {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        val existing = prefs.getString(KEY_DEVICE_ID, null)
        if (existing != null) return existing

        val newId = UUID.randomUUID().toString()
        prefs.edit().putString(KEY_DEVICE_ID, newId).apply()
        return newId
    }

    fun getUserIdFromDeviceId(deviceId: String): String {
        val hash = java.security.MessageDigest.getInstance("SHA-256")
            .digest(deviceId.toByteArray())
            .joinToString("") { "%02x".format(it) }
            .take(16)
        return "user_$hash"
    }
}
