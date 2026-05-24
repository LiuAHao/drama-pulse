package com.dramapulse.app.app

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import com.dramapulse.app.core.data.BranchRepository
import com.dramapulse.app.core.data.BranchRepositoryImpl
import com.dramapulse.app.core.data.ContentRepository
import com.dramapulse.app.core.data.ContentRepositoryImpl
import com.dramapulse.app.core.data.FakeBranchRepository
import com.dramapulse.app.core.data.FakeContentRepository
import com.dramapulse.app.core.data.FakeInteractionRepository
import com.dramapulse.app.core.data.FakeProgressRepository
import com.dramapulse.app.core.data.InteractionRepository
import com.dramapulse.app.core.data.InteractionRepositoryImpl
import com.dramapulse.app.core.data.PersistentPlayerUiRepository
import com.dramapulse.app.core.data.PlayerUiRepository
import com.dramapulse.app.core.data.ProgressRepository
import com.dramapulse.app.core.data.ProgressRepositoryImpl
import com.dramapulse.app.core.data.SharedPreferencesPlayerUiStorage
import com.dramapulse.app.core.network.DeviceIdProvider
import com.dramapulse.app.core.network.NetworkModule
import com.dramapulse.app.core.player.ExoPlayerController
import com.dramapulse.app.core.player.MediaCacheProvider
import com.dramapulse.app.core.util.DeviceUtil

data class AppContainer(
    val contentRepository: ContentRepository,
    val progressRepository: ProgressRepository,
    val interactionRepository: InteractionRepository,
    val branchRepository: BranchRepository,
    val playerUiRepository: PlayerUiRepository,
    val playerController: ExoPlayerController
)

@Composable
fun rememberAppContainer(
    useFakeData: Boolean = true
): AppContainer {
    val context = LocalContext.current

    return remember(useFakeData, context.applicationContext) {
        buildAppContainer(
            context = context.applicationContext,
            useFakeData = useFakeData
        )
    }
}

private fun buildAppContainer(
    context: Context,
    useFakeData: Boolean
): AppContainer {
    val deviceId = DeviceIdProvider.deviceId
    val userId = DeviceUtil.getUserIdFromDeviceId(deviceId)
    val cacheDataSourceFactory = MediaCacheProvider.getCacheDataSourceFactory(context)
    val playerController = ExoPlayerController(context, cacheDataSourceFactory)
    val playerUiRepository = PersistentPlayerUiRepository(
        storage = SharedPreferencesPlayerUiStorage(
            context.getSharedPreferences("drama_pulse_player_ui", Context.MODE_PRIVATE)
        )
    )

    if (useFakeData) {
        val contentRepository = FakeContentRepository()
        return AppContainer(
            contentRepository = contentRepository,
            progressRepository = FakeProgressRepository(contentRepository),
            interactionRepository = FakeInteractionRepository(),
            branchRepository = FakeBranchRepository(),
            playerUiRepository = playerUiRepository,
            playerController = playerController
        )
    }

    return AppContainer(
        contentRepository = ContentRepositoryImpl(NetworkModule.api),
        progressRepository = ProgressRepositoryImpl(
            api = NetworkModule.api,
            deviceId = deviceId,
            userId = userId
        ),
        interactionRepository = InteractionRepositoryImpl(
            api = NetworkModule.api,
            deviceId = deviceId
        ),
        branchRepository = BranchRepositoryImpl(
            api = NetworkModule.api,
            deviceId = deviceId
        ),
        playerUiRepository = playerUiRepository,
        playerController = playerController
    )
}
