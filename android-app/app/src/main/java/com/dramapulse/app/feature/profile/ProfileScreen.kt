package com.dramapulse.app.feature.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.TextButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.ui.tooling.preview.Preview
import com.dramapulse.app.core.design.Dimens
import com.dramapulse.app.ui.component.*
import com.dramapulse.app.ui.preview.PreviewData
import com.dramapulse.app.ui.theme.Accent
import com.dramapulse.app.ui.theme.DramaPulseTheme
import com.dramapulse.app.ui.theme.PageBackground

@Composable
fun ProfileScreen(
    viewModel: ProfileViewModel,
    onNavigateToPlayer: (dramaId: String) -> Unit,
    onNavigateToSettings: () -> Unit,
    modifier: Modifier = Modifier
) {
    LaunchedEffect(Unit) {
        viewModel.onEvent(ProfileEvent.OnEnter)
    }

    val uiState by viewModel.uiState.collectAsState()

    ProfileScreen(
        uiState = uiState,
        onEvent = viewModel::onEvent,
        onDramaClick = onNavigateToPlayer,
        onNavigateToSettings = onNavigateToSettings,
        modifier = modifier
    )
}

@Composable
fun ProfileScreen(
    uiState: ProfileUiState,
    onEvent: (ProfileEvent) -> Unit,
    onDramaClick: (String) -> Unit,
    onNavigateToSettings: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (uiState.isEditingServerUrl) {
        ServerUrlDialog(
            value = uiState.serverUrlInput,
            onValueChange = { onEvent(ProfileEvent.OnServerUrlInputChanged(it)) },
            onDismiss = { onEvent(ProfileEvent.OnDismissServerUrlDialog) },
            onConfirm = { onEvent(ProfileEvent.OnSaveServerUrl) }
        )
    }

    when (uiState.screenState) {
        ProfileScreenState.IDLE, ProfileScreenState.LOADING -> LoadingPanel(modifier)
        ProfileScreenState.ERROR -> ErrorPanel(
            message = uiState.errorMessage ?: "加载失败",
            onRetry = { onEvent(ProfileEvent.OnEnter) },
            modifier = modifier
        )
        ProfileScreenState.CONTENT, ProfileScreenState.EMPTY -> ProfileContent(
            uiState = uiState,
            onEvent = onEvent,
            onDramaClick = onDramaClick,
            onNavigateToSettings = onNavigateToSettings,
            modifier = modifier
        )
    }
}

@Composable
private fun ProfileContent(
    uiState: ProfileUiState,
    onEvent: (ProfileEvent) -> Unit,
    onDramaClick: (String) -> Unit,
    onNavigateToSettings: () -> Unit,
    modifier: Modifier = Modifier
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(3),
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
        // Profile header - full width
        item(span = { GridItemSpan(3) }) {
            ProfileHeader(
                nickname = uiState.nickname,
                avatarUrl = uiState.avatarUrl
            )
        }

        // Stats row - full width
        item(span = { GridItemSpan(3) }) {
            StatsRow(
                watchCount = uiState.watchCount,
                favoriteCount = uiState.favoriteCount,
                branchCount = uiState.branchCount
            )
        }

        // Quick tools - full width
        item(span = { GridItemSpan(3) }) {
            QuickToolsRow(
                selectedSection = uiState.selectedSection,
                onSelect = { onEvent(ProfileEvent.OnSectionSelected(it)) },
                onSettingsClick = onNavigateToSettings
            )
        }

        // Content grid or empty state
        if (uiState.dramas.isEmpty()) {
            item(span = { GridItemSpan(3) }) {
                EmptyPanel(
                    message = when (uiState.selectedSection) {
                        ProfileSection.HISTORY -> "暂无观看记录"
                        ProfileSection.FAVORITES -> "暂无收藏"
                        ProfileSection.MY_BRANCHES -> "暂无分支"
                    },
                    modifier = Modifier.padding(vertical = 48.dp)
                )
            }
        } else {
            items(uiState.dramas) { drama ->
                DramaPosterCard(
                    title = drama.title,
                    coverUrl = drama.coverUrl,
                    heat = drama.heat,
                    tags = drama.tags,
                    posterHeight = Dimens.GridPosterHeight,
                    onClick = { onDramaClick(drama.id) }
                )
            }
        }
    }
}

@Composable
internal fun ServerConfigCard(
    serverBaseUrl: String,
    onEditClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(Dimens.CardRadius))
            .background(MaterialTheme.colorScheme.surface)
            .clickable(onClick = onEditClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "服务端地址",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = serverBaseUrl.ifBlank { "未设置" },
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Icon(
            imageVector = Icons.Default.Edit,
            contentDescription = "编辑服务端地址",
            tint = MaterialTheme.colorScheme.primary
        )
    }
}

@Composable
internal fun ServerUrlDialog(
    value: String,
    onValueChange: (String) -> Unit,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("设置服务端地址") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "真机请填写电脑当前局域网地址，例如 10.208.76.16:8787",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                OutlinedTextField(
                    value = value,
                    onValueChange = onValueChange,
                    singleLine = true,
                    label = { Text("地址") },
                    placeholder = { Text("http://10.208.76.16:8787") }
                )
            }
        },
        confirmButton = {
            Button(onClick = onConfirm) {
                Text("保存")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("取消")
            }
        }
    )
}

@Composable
private fun ProfileHeader(
    nickname: String,
    avatarUrl: String?,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Avatar
        Box(
            modifier = Modifier
                .size(64.dp)
                .background(MaterialTheme.colorScheme.surfaceVariant, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Person,
                contentDescription = "头像",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(36.dp)
            )
        }
        Spacer(modifier = Modifier.width(16.dp))
        Column {
            Text(
                text = nickname,
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "编辑资料 >",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun StatsRow(
    watchCount: Int,
    favoriteCount: Int,
    branchCount: Int,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(Dimens.CardRadius))
            .background(MaterialTheme.colorScheme.surface)
            .padding(vertical = 16.dp),
        horizontalArrangement = Arrangement.SpaceEvenly
    ) {
        StatItem(count = watchCount, label = "看过")
        StatItem(count = favoriteCount, label = "收藏")
        StatItem(count = branchCount, label = "分支")
    }
}

@Composable
private fun StatItem(
    count: Int,
    label: String,
    modifier: Modifier = Modifier
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier
    ) {
        Text(
            text = count.toString(),
            style = MaterialTheme.typography.headlineLarge,
            color = Accent
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun QuickToolsRow(
    selectedSection: ProfileSection,
    onSelect: (ProfileSection) -> Unit,
    onSettingsClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(Dimens.ComponentGap)
    ) {
        QuickActionCard(
            icon = Icons.Default.History,
            label = "我的记录",
            selected = selectedSection == ProfileSection.HISTORY,
            onClick = { onSelect(ProfileSection.HISTORY) },
            modifier = Modifier.weight(1f)
        )
        QuickActionCard(
            icon = Icons.Default.Favorite,
            label = "我的收藏",
            selected = selectedSection == ProfileSection.FAVORITES,
            onClick = { onSelect(ProfileSection.FAVORITES) },
            modifier = Modifier.weight(1f)
        )
        QuickActionCard(
            icon = Icons.Default.PlayArrow,
            label = "分支记录",
            selected = selectedSection == ProfileSection.MY_BRANCHES,
            onClick = { onSelect(ProfileSection.MY_BRANCHES) },
            modifier = Modifier.weight(1f)
        )
    }
    Spacer(modifier = Modifier.height(Dimens.ComponentGap))
    QuickActionCard(
        icon = Icons.Default.Edit,
        label = "设置与调试",
        selected = false,
        onClick = onSettingsClick,
        modifier = Modifier.fillMaxWidth()
    )
}

@Preview(showBackground = true, name = "Profile - Empty")
@Composable
private fun ProfileScreenPreview() {
    DramaPulseTheme {
        ProfileScreen(
            uiState = PreviewData.profileStateEmpty,
            onEvent = {},
            onDramaClick = {},
            onNavigateToSettings = {}
        )
    }
}

@Preview(showBackground = true, name = "Profile - Content")
@Composable
private fun ProfileScreenContentPreview() {
    DramaPulseTheme {
        ProfileScreen(
            uiState = PreviewData.profileState.copy(
                dramas = listOf(PreviewData.drama1, PreviewData.drama2)
            ),
            onEvent = {},
            onDramaClick = {},
            onNavigateToSettings = {}
        )
    }
}
