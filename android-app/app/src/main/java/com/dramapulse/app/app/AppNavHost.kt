package com.dramapulse.app.app

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.navArgument
import com.dramapulse.app.feature.branch.BranchResultScreen
import com.dramapulse.app.feature.branch.BranchViewModel
import com.dramapulse.app.feature.drama_list.DramaListScreen
import com.dramapulse.app.feature.drama_list.DramaListViewModel
import com.dramapulse.app.feature.player.PlayerScreen
import com.dramapulse.app.feature.player.PlayerViewModel
import com.dramapulse.app.feature.profile.ProfileScreen
import com.dramapulse.app.feature.profile.ProfileViewModel
import com.dramapulse.app.core.design.Dimens
import com.dramapulse.app.ui.component.BottomNavBar
import com.dramapulse.app.ui.component.BottomNavTab

private const val USE_FAKE_DATA = false

@Composable
fun AppNavHost(
    navController: NavHostController,
    modifier: Modifier = Modifier
) {
    val appContainer = rememberAppContainer(useFakeData = USE_FAKE_DATA)

    val dramaListViewModel = remember {
        DramaListViewModel(appContainer.contentRepository)
    }

    val playerViewModel = remember {
        PlayerViewModel(
            contentRepository = appContainer.contentRepository,
            progressRepository = appContainer.progressRepository,
            interactionRepository = appContainer.interactionRepository,
            playerUiRepository = appContainer.playerUiRepository,
            playerController = appContainer.playerController
        )
    }

    val profileViewModel = remember { ProfileViewModel() }
    val playerUiState by playerViewModel.uiState.collectAsState()
    val dramaListUiState by dramaListViewModel.uiState.collectAsState()

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    // Determine if bottom nav should be visible
    val showBottomNav = currentRoute in listOf(
        AppRoutes.DRAMA_LIST,
        AppRoutes.PLAYER,
        AppRoutes.PROFILE
    )

    // Determine current tab
    val currentTab = when (currentRoute) {
        AppRoutes.DRAMA_LIST -> BottomNavTab.DRAMA
        AppRoutes.PLAYER -> BottomNavTab.PLAYER
        AppRoutes.PROFILE -> BottomNavTab.PROFILE
        else -> BottomNavTab.DRAMA
    }

    Scaffold(
        bottomBar = {
            if (showBottomNav) {
                BottomNavBar(
                    selectedTab = currentTab,
                    darkMode = currentRoute == AppRoutes.PLAYER,
                    onTabSelected = { tab ->
                        if (currentRoute == AppRoutes.PLAYER && tab != BottomNavTab.PLAYER) {
                            playerViewModel.onLeavePlaybackSurface()
                        }

                        val route = when (tab) {
                            BottomNavTab.DRAMA -> AppRoutes.DRAMA_LIST
                            BottomNavTab.PLAYER -> {
                                val currentDramaId = playerUiState.meta.dramaId.ifBlank {
                                    dramaListUiState.continueWatching?.drama?.id
                                        ?: dramaListUiState.featured.firstOrNull()?.id
                                        ?: dramaListUiState.alternatives.firstOrNull()?.id
                                        ?: "drama-1"
                                }
                                val currentEpisodeId = playerUiState.meta.currentEpisode?.id
                                    ?: dramaListUiState.continueWatching?.episode?.id
                                AppRoutes.playerRoute(currentDramaId, currentEpisodeId)
                            }
                            BottomNavTab.PROFILE -> AppRoutes.PROFILE
                        }

                        if (tab == BottomNavTab.DRAMA) {
                            navController.popBackStack(AppRoutes.DRAMA_LIST, false)
                        } else {
                            navController.navigate(route) {
                                popUpTo(AppRoutes.DRAMA_LIST) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    }
                )
            }
        }
    ) { innerPadding ->
        val contentModifier = if (currentRoute == AppRoutes.PLAYER) {
            modifier.padding(bottom = Dimens.BottomNavHeight)
        } else {
            modifier.padding(innerPadding)
        }

        NavHost(
            navController = navController,
            startDestination = AppRoutes.DRAMA_LIST,
            modifier = contentModifier
        ) {
            composable(AppRoutes.DRAMA_LIST) {
                DramaListScreen(
                    uiState = dramaListUiState,
                    onEvent = dramaListViewModel::onEvent,
                    onNavigateToPlayer = { dramaId, episodeId ->
                        navController.navigate(AppRoutes.playerRoute(dramaId, episodeId))
                    }
                )
            }

            composable(
                route = AppRoutes.PLAYER,
                arguments = listOf(
                    navArgument("dramaId") { type = NavType.StringType },
                    navArgument("episodeId") {
                        type = NavType.StringType
                        nullable = true
                        defaultValue = null
                    }
                )
            ) { backStackEntry ->
                val dramaId = backStackEntry.arguments?.getString("dramaId") ?: ""
                val episodeId = backStackEntry.arguments?.getString("episodeId")
                PlayerScreen(
                    dramaId = dramaId,
                    episodeId = episodeId,
                    viewModel = playerViewModel,
                    playerController = appContainer.playerController,
                    onBack = { navController.popBackStack() },
                    onNavigateToBranch = { epId ->
                        navController.navigate(AppRoutes.branchResultRoute(epId))
                    }
                )
            }

            composable(
                route = AppRoutes.BRANCH_RESULT,
                arguments = listOf(
                    navArgument("episodeId") { type = NavType.StringType }
                )
            ) { backStackEntry ->
                val episodeId = backStackEntry.arguments?.getString("episodeId") ?: ""
                val branchViewModel = remember(episodeId) {
                    BranchViewModel(appContainer.branchRepository)
                }
                BranchResultScreen(
                    episodeId = episodeId,
                    viewModel = branchViewModel,
                    onBack = { navController.popBackStack() }
                )
            }

            composable(AppRoutes.PROFILE) {
                ProfileScreen(
                    viewModel = profileViewModel,
                    onNavigateToPlayer = { dramaId ->
                        navController.navigate(AppRoutes.playerRoute(dramaId))
                    }
                )
            }
        }
    }
}
