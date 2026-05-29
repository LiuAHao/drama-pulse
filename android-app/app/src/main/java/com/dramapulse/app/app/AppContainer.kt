package com.dramapulse.app.app

import android.content.Context
import android.content.SharedPreferences
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
import com.dramapulse.app.core.data.RemoteFirstPlayerUiRepository
import com.dramapulse.app.core.data.SharedPreferencesPlayerUiStorage
import com.dramapulse.app.core.network.DeviceIdProvider
import com.dramapulse.app.core.network.NetworkModule
import com.dramapulse.app.core.network.ServerConfigRepository
import com.dramapulse.app.core.network.DramaPulseApi
import com.dramapulse.app.core.player.ExoPlayerController
import com.dramapulse.app.core.player.MediaCacheProvider
import com.dramapulse.app.core.util.DeviceUtil

data class AppContainer(
    val deviceId: String,
    val api: DramaPulseApi,
    val contentRepository: ContentRepository,
    val progressRepository: ProgressRepository,
    val interactionRepository: InteractionRepository,
    val branchRepository: BranchRepository,
    val playerUiRepository: PlayerUiRepository,
    val playerController: ExoPlayerController,
    val serverConfigRepository: ServerConfigRepository,
    val profileSharedPreferences: SharedPreferences
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
    val serverConfigRepository = ServerConfigRepository(context)
    val profileSharedPreferences = context.getSharedPreferences("drama_pulse_profile", Context.MODE_PRIVATE)
    val localPlayerUiRepository = PersistentPlayerUiRepository(
        storage = SharedPreferencesPlayerUiStorage(
            context.getSharedPreferences("drama_pulse_player_ui", Context.MODE_PRIVATE)
        )
    )
    val repositoryStorage = SharedPreferencesPlayerUiStorage(
        context.getSharedPreferences("drama_pulse_repository_cache", Context.MODE_PRIVATE)
    )

    if (useFakeData) {
        val contentRepository = FakeContentRepository()
        return AppContainer(
            deviceId = deviceId,
            api = NetworkModule.api,
            contentRepository = contentRepository,
            progressRepository = FakeProgressRepository(contentRepository),
            interactionRepository = FakeInteractionRepository(),
            branchRepository = FakeBranchRepository(),
            playerUiRepository = localPlayerUiRepository,
            playerController = playerController,
            serverConfigRepository = serverConfigRepository,
            profileSharedPreferences = profileSharedPreferences
        )
    }

    return AppContainer(
        deviceId = deviceId,
        api = NetworkModule.api,
        contentRepository = ContentRepositoryImpl(
            api = NetworkModule.api,
            storage = repositoryStorage
        ),
        progressRepository = ProgressRepositoryImpl(
            api = NetworkModule.api,
            deviceId = deviceId,
            userId = userId,
            storage = repositoryStorage
        ),
        interactionRepository = InteractionRepositoryImpl(
            api = NetworkModule.api,
            deviceId = deviceId
        ),
        branchRepository = BranchRepositoryImpl(
            api = NetworkModule.api,
            deviceId = deviceId
        ),
        playerUiRepository = RemoteFirstPlayerUiRepository(
            api = NetworkModule.api,
            userId = userId,
            deviceId = deviceId,
            localCache = localPlayerUiRepository
        ),
        playerController = playerController,
        serverConfigRepository = serverConfigRepository,
        profileSharedPreferences = profileSharedPreferences
    )
}
