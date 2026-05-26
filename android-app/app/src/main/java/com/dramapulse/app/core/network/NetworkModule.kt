package com.dramapulse.app.core.network

import okhttp3.HttpUrl.Companion.toHttpUrl
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit

object NetworkModule {

    private const val PLACEHOLDER_BASE_URL = "http://localhost:8787/"
    private const val DEVICE_ID_HEADER = "x-device-id"
    private lateinit var serverConfigRepository: ServerConfigRepository

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
    }

    fun initialize(serverConfigRepository: ServerConfigRepository) {
        this.serverConfigRepository = serverConfigRepository
    }

    private fun requireServerConfigRepository(): ServerConfigRepository {
        check(::serverConfigRepository.isInitialized) {
            "NetworkModule must be initialized before use."
        }
        return serverConfigRepository
    }

    private fun rewriteRequestBaseUrl(request: Request): Request {
        val baseUrl = requireServerConfigRepository().getBaseUrlOrNull()
            ?: return request
        val configuredBaseUrl = baseUrl.toHttpUrl()
        val originalUrl = request.url
        val newUrl = originalUrl.newBuilder()
            .scheme(configuredBaseUrl.scheme)
            .host(configuredBaseUrl.host)
            .port(configuredBaseUrl.port)
            .build()
        return request.newBuilder().url(newUrl).build()
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor { chain ->
            val request = rewriteRequestBaseUrl(chain.request()).newBuilder()
                .addHeader(DEVICE_ID_HEADER, DeviceIdProvider.deviceId)
                .build()
            chain.proceed(request)
        }
        .addInterceptor(
            HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }
        )
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(PLACEHOLDER_BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    val api: DramaPulseApi = retrofit.create(DramaPulseApi::class.java)
}

object DeviceIdProvider {
    lateinit var deviceId: String
}
