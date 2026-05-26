package com.dramapulse.app.feature.drama_list

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.dramapulse.app.core.design.Dimens
import com.dramapulse.app.ui.component.*
import com.dramapulse.app.ui.preview.PreviewData
import com.dramapulse.app.ui.theme.DramaPulseTheme
import com.dramapulse.app.ui.theme.PageBackground

@Composable
fun DramaListScreen(
    uiState: DramaListUiState,
    onEvent: (DramaListEvent) -> Unit,
    onNavigateToPlayer: (dramaId: String, episodeId: String?) -> Unit,
    modifier: Modifier = Modifier
) {
    LaunchedEffect(Unit) {
        onEvent(DramaListEvent.OnEnter)
    }

    when (uiState.screenState) {
        ScreenState.IDLE, ScreenState.LOADING -> LoadingPanel(modifier)
        ScreenState.ERROR -> ErrorPanel(
            message = uiState.errorMessage ?: "加载失败",
            onRetry = { onEvent(DramaListEvent.OnRetry) },
            modifier = modifier
        )
        ScreenState.EMPTY -> EmptyPanel(
            message = "暂无短剧",
            modifier = modifier
        )
        ScreenState.CONTENT -> DramaListContent(
            uiState = uiState,
            onDramaClick = { dramaId ->
                onNavigateToPlayer(dramaId, null)
            },
            onContinueWatchingClick = { dramaId, episodeId ->
                onNavigateToPlayer(dramaId, episodeId)
            },
            modifier = modifier
        )
    }
}

@Composable
private fun DramaListContent(
    uiState: DramaListUiState,
    onDramaClick: (String) -> Unit,
    onContinueWatchingClick: (dramaId: String, episodeId: String) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        modifier = modifier
            .fillMaxSize()
            .background(PageBackground),
        contentPadding = PaddingValues(
            horizontal = Dimens.PageHorizontal,
            vertical = Dimens.PaddingL
        ),
        horizontalArrangement = Arrangement.spacedBy(Dimens.ComponentGap),
        verticalArrangement = Arrangement.spacedBy(Dimens.ComponentGap)
    ) {
        uiState.continueWatching?.let { continueWatching ->
            item(span = { GridItemSpan(2) }) {
                ContinueWatchingCard(
                    model = continueWatching,
                    onClick = {
                        onContinueWatchingClick(
                            continueWatching.drama.id,
                            continueWatching.episode.id
                        )
                    },
                    modifier = Modifier.padding(top = Dimens.ModuleGap)
                )
            }
        }

        // Section title - full width
        item(span = { GridItemSpan(2) }) {
            Text(
                text = "精选短剧",
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.padding(top = Dimens.PaddingS)
            )
        }

        // Drama poster grid - 2 columns
        val dramas = uiState.featured + uiState.alternatives

        items(dramas) { drama ->
            DramaPosterCard(
                title = drama.title,
                coverUrl = drama.coverUrl,
                heat = drama.heat,
                tags = drama.tags,
                onClick = { onDramaClick(drama.id) }
            )
        }
    }
}

@Preview(showBackground = true, name = "DramaList - Content")
@Composable
private fun DramaListScreenPreview() {
    DramaPulseTheme {
        DramaListScreen(
            uiState = PreviewData.dramaListState,
            onEvent = {},
            onNavigateToPlayer = { _, _ -> }
        )
    }
}
