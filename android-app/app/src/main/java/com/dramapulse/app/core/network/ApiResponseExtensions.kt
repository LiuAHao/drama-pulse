package com.dramapulse.app.core.network

import com.dramapulse.app.core.model.remote.ApiResponse

fun <T> ApiResponse<T>.unwrap(): T {
    if (code != 0) {
        throw ApiException(code, message)
    }
    return data
}
