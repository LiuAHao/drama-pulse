package com.dramapulse.app.core.network

import android.content.Context
import android.os.Build
import java.net.URI

class ServerConfigRepository(private val context: Context) {

    private val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    fun getBaseUrlOrNull(): String? {
        val saved = prefs.getString(KEY_API_BASE_URL, null)?.trim().orEmpty()
        if (saved.isNotBlank()) {
            return saved.ensureHttpBaseUrl()
        }
        return getDefaultBaseUrl()
    }

    fun getDisplayBaseUrl(): String {
        return getBaseUrlOrNull()?.removeSuffix("/") ?: ""
    }

    fun saveBaseUrl(value: String) {
        prefs.edit().putString(KEY_API_BASE_URL, value.ensureHttpBaseUrl()).apply()
    }

    private fun getDefaultBaseUrl(): String? {
        return if (isProbablyEmulator()) {
            "http://10.0.2.2:8787/"
        } else {
            null
        }
    }

    private fun isProbablyEmulator(): Boolean {
        return Build.FINGERPRINT.contains("generic", ignoreCase = true) ||
            Build.MODEL.contains("google_sdk", ignoreCase = true) ||
            Build.MODEL.contains("Emulator", ignoreCase = true) ||
            Build.MODEL.contains("Android SDK built for", ignoreCase = true) ||
            Build.MANUFACTURER.contains("Genymotion", ignoreCase = true) ||
            Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic") ||
            "google_sdk".equals(Build.PRODUCT, ignoreCase = true)
    }

    companion object {
        private const val PREF_NAME = "drama_pulse_network"
        private const val KEY_API_BASE_URL = "api_base_url"
    }
}

fun String.ensureHttpBaseUrl(): String {
    val normalized = trim().removeSuffix("/")
    val withScheme = if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
        normalized
    } else {
        "http://$normalized"
    }
    return "$withScheme/"
}

fun String.isLikelyValidServerBaseUrl(): Boolean {
    return try {
        val uri = URI(ensureHttpBaseUrl())
        val host = uri.host ?: return false
        val port = uri.port.takeIf { it != -1 } ?: 80
        host.isNotBlank() &&
            port in 1..65535 &&
            !host.startsWith("127.") &&
            host != "localhost"
    } catch (_: Exception) {
        false
    }
}
