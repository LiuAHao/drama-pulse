package com.dramapulse.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import com.dramapulse.app.app.AppNavHost
import com.dramapulse.app.core.network.DeviceIdProvider
import com.dramapulse.app.core.network.NetworkModule
import com.dramapulse.app.core.network.ServerConfigRepository
import com.dramapulse.app.core.util.DeviceUtil
import com.dramapulse.app.ui.theme.DramaPulseTheme
import com.dramapulse.app.ui.theme.PageBackground

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        DeviceIdProvider.deviceId = DeviceUtil.getOrCreateDeviceId(this)
        NetworkModule.initialize(ServerConfigRepository(applicationContext))

        enableEdgeToEdge()
        setContent {
            DramaPulseTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = PageBackground
                ) {
                    val navController = rememberNavController()
                    AppNavHost(navController = navController)
                }
            }
        }
    }
}
