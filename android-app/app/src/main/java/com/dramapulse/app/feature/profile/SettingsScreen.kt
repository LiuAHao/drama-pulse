package com.dramapulse.app.feature.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.dramapulse.app.core.design.Dimens
import com.dramapulse.app.core.model.HighlightType
import com.dramapulse.app.ui.theme.PageBackground

@Composable
fun SettingsScreen(
    viewModel: ProfileViewModel,
    onBack: () -> Unit,
    onOpenDebugPlayer: () -> Unit,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()

    if (uiState.isEditingServerUrl) {
        ServerUrlDialog(
            value = uiState.serverUrlInput,
            onValueChange = { viewModel.onEvent(ProfileEvent.OnServerUrlInputChanged(it)) },
            onDismiss = { viewModel.onEvent(ProfileEvent.OnDismissServerUrlDialog) },
            onConfirm = { viewModel.onEvent(ProfileEvent.OnSaveServerUrl) }
        )
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(PageBackground)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(Color.White)
                    .clickable(onClick = onBack),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Default.ArrowBack,
                    contentDescription = "返回"
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = "设置与调试",
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onBackground
            )
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = Dimens.PageHorizontal),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            SettingsSectionCard(
                title = "服务端设置",
                description = "管理真机当前连接的后端地址"
            ) {
                ServerConfigCard(
                    serverBaseUrl = uiState.serverBaseUrl,
                    onEditClick = { viewModel.onEvent(ProfileEvent.OnEditServerUrlClick) }
                )
            }

            SettingsSectionCard(
                title = "高光组件调试",
                description = "直接切换类别和强度，手动预览客户端高光交互效果"
            ) {
                Text(
                    text = "类别",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(10.dp))
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(HighlightType.FEEL_GOOD, HighlightType.REVERSAL).forEach { type ->
                            FilterChipLike(
                                label = typeLabel(type),
                                selected = uiState.debugHighlightType == type,
                                onClick = {
                                    viewModel.onEvent(ProfileEvent.OnDebugHighlightTypeSelected(type))
                                }
                            )
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(HighlightType.CONFLICT, HighlightType.SWEET).forEach { type ->
                            FilterChipLike(
                                label = typeLabel(type),
                                selected = uiState.debugHighlightType == type,
                                onClick = {
                                    viewModel.onEvent(ProfileEvent.OnDebugHighlightTypeSelected(type))
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "强度",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(10.dp))
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        (1..3).forEach { intensity ->
                            FilterChipLike(
                                label = "强度 $intensity",
                                selected = uiState.debugHighlightIntensity == intensity,
                                onClick = {
                                    viewModel.onEvent(ProfileEvent.OnDebugHighlightIntensitySelected(intensity))
                                }
                            )
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        (4..5).forEach { intensity ->
                            FilterChipLike(
                                label = "强度 $intensity",
                                selected = uiState.debugHighlightIntensity == intensity,
                                onClick = {
                                    viewModel.onEvent(ProfileEvent.OnDebugHighlightIntensitySelected(intensity))
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))
                Text(
                    text = "当前将以真实播放态预览：${typeLabel(uiState.debugHighlightType)} / 强度 ${uiState.debugHighlightIntensity}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(12.dp))
                Button(
                    onClick = onOpenDebugPlayer,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("进入真实播放页调试")
                }
            }
        }
    }
}

@Composable
private fun SettingsSectionCard(
    title: String,
    description: String,
    content: @Composable () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(Dimens.CardRadius))
            .background(MaterialTheme.colorScheme.surface)
            .padding(16.dp)
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.SemiBold),
            color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = description,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(16.dp))
        content()
    }
}

@Composable
private fun FilterChipLike(
    label: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .clip(CircleShape)
            .background(
                if (selected) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.surfaceVariant
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 10.dp)
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            color = if (selected) MaterialTheme.colorScheme.onPrimary
            else MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

private fun typeLabel(type: HighlightType): String = when (type) {
    HighlightType.FEEL_GOOD -> "爽点"
    HighlightType.REVERSAL -> "反转"
    HighlightType.CONFLICT -> "冲突"
    HighlightType.SWEET -> "甜蜜"
    HighlightType.FUNNY -> "搞笑"
    HighlightType.SUSPENSE -> "悬念"
    HighlightType.EMOTION_BURST -> "情绪爆发"
}

@Preview(showBackground = true, name = "Settings")
@Composable
private fun SettingsScreenPreview() {
}
