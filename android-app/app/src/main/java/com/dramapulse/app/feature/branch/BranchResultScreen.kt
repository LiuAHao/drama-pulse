package com.dramapulse.app.feature.branch

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import coil.compose.AsyncImage
import com.dramapulse.app.core.model.BranchOptionModel
import com.dramapulse.app.core.model.BranchTaskModel
import com.dramapulse.app.core.model.StoryboardCard
import com.dramapulse.app.ui.component.EmptyPanel
import com.dramapulse.app.ui.component.ErrorPanel
import com.dramapulse.app.ui.component.LoadingPanel
import com.dramapulse.app.ui.theme.Accent
import com.dramapulse.app.ui.theme.Divider as DividerColor
import com.dramapulse.app.ui.theme.PageBackground
import com.dramapulse.app.ui.theme.TextPrimary
import com.dramapulse.app.ui.theme.TextSecondary

@Composable
fun BranchResultScreen(
    episodeId: String,
    entryMode: String,
    optionId: String?,
    viewModel: BranchViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    LaunchedEffect(episodeId, entryMode, optionId) {
        viewModel.onEvent(BranchEvent.LoadEntry(episodeId, entryMode, optionId))
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
                fixedOption = uiState.selectedFixedOption,
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
                color = TextPrimary
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
                color = TextPrimary
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
                    unfocusedBorderColor = DividerColor
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
    fixedOption: BranchOptionModel?,
    task: BranchTaskModel?,
    uiState: BranchUiState,
    viewModel: BranchViewModel,
    modifier: Modifier = Modifier
) {
    if (task == null && fixedOption == null) return
    val taskStoryboardCards = task?.let { activeTask ->
        activeTask.storyboardCards.ifEmpty {
            activeTask.storyboard.map { scene ->
                val image = activeTask.storyboardImages.find { it.scene == scene.scene }
                StoryboardCard(
                    scene = scene.scene,
                    sceneTitle = "场景 ${scene.scene}",
                    imageUrl = image?.imageUrl.orEmpty(),
                    narrationText = scene.description,
                    dialogueText = "",
                    order = scene.scene,
                    endingCard = false
                )
            }
        }
    } ?: emptyList()
    val shouldShowTaskStoryBody = task != null && taskStoryboardCards.isEmpty() && task.resultStory.isNotEmpty()

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (fixedOption != null) {
            item {
                FixedBranchResult(option = fixedOption)
            }
        } else if (task != null) {
            item {
                Text(
                    text = task.resultTitle,
                    style = MaterialTheme.typography.headlineLarge,
                    color = Accent
                )
            }

            if (task.resultHook.isNotEmpty()) {
                item {
                    ResultSectionCard(
                        title = "钩子",
                        body = task.resultHook,
                        emphasize = true
                    )
                }
            }

            if (shouldShowTaskStoryBody) {
                item {
                    ResultSectionCard(
                        title = "剧情正文",
                        body = task.resultStory
                    )
                }
            }

            if (taskStoryboardCards.isNotEmpty()) {
                item {
                    Text(
                        text = "图文剧情",
                        style = MaterialTheme.typography.headlineMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
                items(taskStoryboardCards) { card ->
                    StoryboardComicCard(card = card)
                }
            }
        }

        if (task != null && uiState.canInteractWithTask) {
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
                            unfocusedBorderColor = DividerColor
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

@Composable
private fun FixedBranchResult(
    option: BranchOptionModel
) {
    val storyParagraphs = remember(option.resultStory) {
        option.resultStory
            .split(Regex("\\n\\s*\\n"))
            .map { it.trim() }
            .filter { it.isNotBlank() }
    }
    val hasGeneratedPayload = option.generatedPayloadUrl.isNotBlank()
    val storyboardCards = remember(option.storyboardCards) {
        option.storyboardCards
    }
    val shouldShowStoryBody = storyboardCards.isEmpty() && storyParagraphs.isNotEmpty()

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text(
            text = option.title,
            style = MaterialTheme.typography.headlineLarge,
            color = Accent
        )
        if (option.description.isNotBlank()) {
            ResultSectionCard(
                title = "分支概述",
                body = option.description
            )
        }
        if (option.resultHook.isNotBlank()) {
            ResultSectionCard(
                title = "钩子",
                body = option.resultHook,
                emphasize = true
            )
        }
        if (shouldShowStoryBody) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "剧情正文",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface
                )
                storyParagraphs.forEach { paragraph ->
                    ResultSectionCard(
                        title = null,
                        body = paragraph
                    )
                }
            }
        }
        if (storyboardCards.isNotEmpty()) {
            Text(
                text = "图文剧情",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
            storyboardCards.forEach { card ->
                StoryboardComicCard(card = card)
            }
        } else if (hasGeneratedPayload) {
            ResultSectionCard(
                title = "图文分镜",
                body = "分镜素材加载失败，请返回重试或重新刷新固定分支产物。"
            )
        } else if (option.storyboard.isNotEmpty()) {
            Text(
                text = "图文剧情",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
            option.storyboard.forEach { scene ->
                ResultSectionCard(
                    title = "场景 ${scene.scene}",
                    body = scene.description
                )
            }
        }
    }
}

@Composable
private fun StoryboardComicCard(
    card: StoryboardCard,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(
                width = 1.dp,
                color = DividerColor.copy(alpha = 0.6f),
                shape = RoundedCornerShape(16.dp)
            )
            .padding(12.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(
                text = card.sceneTitle.ifBlank { "场景 ${card.scene}" },
                style = MaterialTheme.typography.labelLarge,
                color = Accent
            )
            if (card.imageUrl.isNotBlank()) {
                AsyncImage(
                    model = card.imageUrl,
                    contentDescription = card.sceneTitle.ifBlank { "分镜场景 ${card.scene}" },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(220.dp)
                        .clip(RoundedCornerShape(12.dp)),
                    contentScale = androidx.compose.ui.layout.ContentScale.Crop
                )
            }
            if (card.dialogueText.isNotBlank()) {
                Text(
                    text = card.dialogueText,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Accent
                )
            }
            if (card.narrationText.isNotBlank()) {
                Text(
                    text = card.narrationText,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
        }
    }
}

@Composable
private fun ResultSectionCard(
    title: String?,
    body: String,
    emphasize: Boolean = false
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(
                width = 1.dp,
                color = if (emphasize) Accent.copy(alpha = 0.35f) else DividerColor.copy(alpha = 0.6f),
                shape = RoundedCornerShape(12.dp)
            )
            .padding(14.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (!title.isNullOrBlank()) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelLarge,
                    color = if (emphasize) Accent else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Text(
                text = body,
                style = MaterialTheme.typography.bodyMedium,
                color = if (emphasize) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
