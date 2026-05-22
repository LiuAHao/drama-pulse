package com.dramapulse.app.feature.branch

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.dramapulse.app.core.model.BranchTaskModel
import com.dramapulse.app.ui.component.EmptyPanel
import com.dramapulse.app.ui.component.ErrorPanel
import com.dramapulse.app.ui.component.LoadingPanel
import com.dramapulse.app.ui.theme.Accent
import com.dramapulse.app.ui.theme.Divider
import com.dramapulse.app.ui.theme.PageBackground
import com.dramapulse.app.ui.theme.TextPrimary
import com.dramapulse.app.ui.theme.TextSecondary

@Composable
fun BranchResultScreen(
    episodeId: String,
    viewModel: BranchViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    LaunchedEffect(episodeId) {
        viewModel.onEvent(BranchEvent.LoadOptions(episodeId))
    }

    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(PageBackground)
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "返回",
                        tint = MaterialTheme.colorScheme.onSurface
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "选择结局",
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
        },
        containerColor = PageBackground
    ) { padding ->
        when (uiState.screenState) {
            BranchScreenState.IDLE, BranchScreenState.LOADING_OPTIONS -> LoadingPanel(
                modifier = Modifier.padding(padding)
            )
            BranchScreenState.SHOWING_OPTIONS -> BranchOptionsContent(
                uiState = uiState,
                viewModel = viewModel,
                modifier = Modifier.padding(padding)
            )
            BranchScreenState.CREATING_TASK, BranchScreenState.POLLING_TASK -> LoadingPanel(
                modifier = Modifier.padding(padding)
            )
            BranchScreenState.TASK_SUCCESS -> BranchTaskResult(
                task = uiState.branchTask,
                uiState = uiState,
                viewModel = viewModel,
                modifier = Modifier.padding(padding)
            )
            BranchScreenState.TASK_FAILED -> ErrorPanel(
                message = uiState.errorMessage ?: "生成失败",
                onRetry = { viewModel.onEvent(BranchEvent.LoadOptions(episodeId)) },
                modifier = Modifier.padding(padding)
            )
            else -> EmptyPanel(
                message = "加载中",
                modifier = Modifier.padding(padding)
            )
        }
    }
}

@Composable
private fun BranchOptionsContent(
    uiState: BranchUiState,
    viewModel: BranchViewModel,
    modifier: Modifier = Modifier
) {
    var customPrompt by remember { mutableStateOf("") }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(
                text = "固定分支",
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(8.dp))
        }

        items(uiState.branchOptions) { option ->
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .clickable { viewModel.onEvent(BranchEvent.SelectOption(option)) }
                    .padding(16.dp)
            ) {
                Column {
                    Text(
                        text = option.title,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    if (option.description.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = option.description,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "自定义分支",
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = customPrompt,
                onValueChange = { customPrompt = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("输入你的结局想法...", color = TextSecondary) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    focusedBorderColor = Accent,
                    unfocusedBorderColor = Divider
                ),
                maxLines = 3
            )
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = {
                    if (customPrompt.isNotBlank()) {
                        viewModel.onEvent(BranchEvent.CreateCustomTask(customPrompt))
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Accent)
            ) {
                Text("生成自定义结局")
            }
        }
    }
}

@Composable
private fun BranchTaskResult(
    task: BranchTaskModel?,
    uiState: BranchUiState,
    viewModel: BranchViewModel,
    modifier: Modifier = Modifier
) {
    if (task == null) return

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(
                text = task.resultTitle,
                style = MaterialTheme.typography.headlineLarge,
                color = Accent
            )
        }

        if (task.resultHook.isNotEmpty()) {
            item {
                Text(
                    text = task.resultHook,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
        }

        if (task.resultStory.isNotEmpty()) {
            item {
                Text(
                    text = task.resultStory,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        if (task.storyboard.isNotEmpty()) {
            item {
                Text(
                    text = "分镜",
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
            items(task.storyboard) { scene ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(MaterialTheme.colorScheme.surface)
                        .padding(12.dp)
                ) {
                    Text(
                        text = "场景 ${scene.scene}：${scene.description}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }

        if (uiState.canInteractWithTask) {
            item {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Button(
                        onClick = { viewModel.onEvent(BranchEvent.LikeTask(task.id)) },
                        colors = ButtonDefaults.buttonColors(containerColor = Accent)
                    ) {
                        Text("👍 ${task.likeCount}")
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(8.dp))
                var commentText by remember { mutableStateOf("") }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = commentText,
                        onValueChange = { commentText = it },
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("说点什么...", color = TextSecondary) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            focusedBorderColor = Accent,
                            unfocusedBorderColor = Divider
                        )
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            if (commentText.isNotBlank()) {
                                viewModel.onEvent(BranchEvent.SubmitComment(task.id, commentText))
                                commentText = ""
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Accent)
                    ) {
                        Text("发送")
                    }
                }
            }

            if (uiState.isLoadingComments) {
                item {
                    Text(
                        text = "评论加载中...",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = 0.6f)
                    )
                }
            }

            items(uiState.comments) { comment ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(MaterialTheme.colorScheme.surface)
                        .padding(12.dp)
                ) {
                    Text(
                        text = comment.content,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        } else {
            item {
                Text(
                    text = "当前是预设分支结果，点赞和评论会在自定义生成结果中开放。",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
