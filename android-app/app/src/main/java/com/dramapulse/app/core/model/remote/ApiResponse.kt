package com.dramapulse.app.core.model.remote

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ApiResponse<T>(
    val code: Int = 0,
    val message: String = "ok",
    val data: T
)

@Serializable
data class PaginatedData<T>(
    val items: List<T>,
    val total: Int,
    val page: Int,
    val pageSize: Int,
    val totalPages: Int
)
