package com.dramapulse.app.core.network

class ApiException(
    val code: Int,
    override val message: String
) : Exception(message)

suspend fun <T> safeApiCall(block: suspend () -> T): Result<T> {
    return try {
        Result.success(block())
    } catch (e: ApiException) {
        Result.failure(e)
    } catch (e: Exception) {
        Result.failure(e)
    }
}
