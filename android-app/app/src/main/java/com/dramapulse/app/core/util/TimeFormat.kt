package com.dramapulse.app.core.util

import java.time.Instant

fun String.toEpochMillisOrNow(): Long {
    return runCatching { Instant.parse(this).toEpochMilli() }
        .getOrDefault(System.currentTimeMillis())
}
