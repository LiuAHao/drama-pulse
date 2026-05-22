package com.dramapulse.app.feature.branch

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dramapulse.app.core.data.BranchRepository
import com.dramapulse.app.core.model.BranchCommentModel
import com.dramapulse.app.core.model.BranchOptionModel
import com.dramapulse.app.core.model.BranchTaskModel
import com.dramapulse.app.core.model.BranchTaskStatus
import com.dramapulse.app.core.model.StoryboardScene
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class BranchUiState(
    val screenState: BranchScreenState = BranchScreenState.IDLE,
    val activeEpisodeId: String = "",
    val branchOptions: List<BranchOptionModel> = emptyList(),
    val branchTask: BranchTaskModel? = null,
    val canInteractWithTask: Boolean = false,
    val comments: List<BranchCommentModel> = emptyList(),
    val commentTotal: Int = 0,
    val isLoadingComments: Boolean = false,
    val errorMessage: String? = null
)

enum class BranchScreenState {
    IDLE, LOADING_OPTIONS, SHOWING_OPTIONS,
    CREATING_TASK, POLLING_TASK, TASK_SUCCESS, TASK_FAILED
}

sealed class BranchEvent {
    data class LoadOptions(val episodeId: String) : BranchEvent()
    data class SelectOption(val option: BranchOptionModel) : BranchEvent()
    data class CreateCustomTask(val prompt: String) : BranchEvent()
    data class LikeTask(val taskId: String) : BranchEvent()
    data class SubmitComment(val taskId: String, val content: String) : BranchEvent()
    data class LoadComments(val taskId: String) : BranchEvent()
}

class BranchViewModel(
    private val branchRepository: BranchRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(BranchUiState())
    val uiState: StateFlow<BranchUiState> = _uiState.asStateFlow()

    fun onEvent(event: BranchEvent) {
        when (event) {
            is BranchEvent.LoadOptions -> loadOptions(event.episodeId)
            is BranchEvent.SelectOption -> selectOption(event.option)
            is BranchEvent.CreateCustomTask -> createCustomTask(event.prompt)
            is BranchEvent.LikeTask -> likeTask(event.taskId)
            is BranchEvent.SubmitComment -> submitComment(event.taskId, event.content)
            is BranchEvent.LoadComments -> loadComments(event.taskId)
        }
    }

    private fun loadOptions(episodeId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(screenState = BranchScreenState.LOADING_OPTIONS) }
            try {
                val options = branchRepository.getBranchOptions(episodeId)
                _uiState.update {
                    it.copy(
                        screenState = BranchScreenState.SHOWING_OPTIONS,
                        activeEpisodeId = episodeId,
                        branchOptions = options,
                        branchTask = null,
                        canInteractWithTask = false,
                        comments = emptyList(),
                        commentTotal = 0,
                        isLoadingComments = false,
                        errorMessage = null
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        screenState = BranchScreenState.TASK_FAILED,
                        errorMessage = e.message ?: "加载失败"
                    )
                }
            }
        }
    }

    private fun selectOption(option: BranchOptionModel) {
        _uiState.update {
            it.copy(
                screenState = BranchScreenState.TASK_SUCCESS,
                branchTask = option.toPreviewTask(),
                canInteractWithTask = false,
                comments = emptyList(),
                commentTotal = 0,
                isLoadingComments = false,
                errorMessage = null
            )
        }
    }

    private fun createCustomTask(prompt: String) {
        val episodeId = _uiState.value.activeEpisodeId
        if (episodeId.isBlank()) {
            _uiState.update {
                it.copy(
                    screenState = BranchScreenState.TASK_FAILED,
                    errorMessage = "缺少分支上下文，请返回重试"
                )
            }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(screenState = BranchScreenState.CREATING_TASK) }
            try {
                val task = branchRepository.createBranchTask(episodeId, prompt)
                _uiState.update {
                    it.copy(
                        screenState = BranchScreenState.POLLING_TASK,
                        branchTask = task,
                        canInteractWithTask = false,
                        comments = emptyList(),
                        commentTotal = 0
                    )
                }
                pollTask(task.id)
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        screenState = BranchScreenState.TASK_FAILED,
                        errorMessage = e.message ?: "创建失败"
                    )
                }
            }
        }
    }

    private fun pollTask(taskId: String) {
        viewModelScope.launch {
            repeat(30) {
                delay(2000)
                try {
                    val task = branchRepository.getBranchTask(taskId)
                    _uiState.update { it.copy(branchTask = task) }
                    when (task.status) {
                        BranchTaskStatus.SUCCESS -> {
                            _uiState.update {
                                it.copy(
                                    screenState = BranchScreenState.TASK_SUCCESS,
                                    canInteractWithTask = true
                                )
                            }
                            loadComments(task.id)
                            return@launch
                        }
                        BranchTaskStatus.FAILED, BranchTaskStatus.TIMEOUT, BranchTaskStatus.BLOCKED -> {
                            _uiState.update { it.copy(screenState = BranchScreenState.TASK_FAILED) }
                            return@launch
                        }
                        else -> {}
                    }
                } catch (_: Exception) {}
            }
            _uiState.update { it.copy(screenState = BranchScreenState.TASK_FAILED) }
        }
    }

    private fun likeTask(taskId: String) {
        viewModelScope.launch {
            try {
                val count = branchRepository.likeBranchTask(taskId)
                _uiState.update {
                    it.copy(
                        branchTask = it.branchTask?.copy(likeCount = count)
                    )
                }
            } catch (_: Exception) {}
        }
    }

    private fun submitComment(taskId: String, content: String) {
        viewModelScope.launch {
            try {
                val comment = branchRepository.createComment(taskId, content)
                _uiState.update {
                    it.copy(
                        comments = listOf(comment) + it.comments,
                        commentTotal = it.commentTotal + 1,
                        branchTask = it.branchTask?.copy(
                            commentCount = (it.branchTask?.commentCount ?: 0) + 1
                        )
                    )
                }
            } catch (_: Exception) {}
        }
    }

    private fun loadComments(taskId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingComments = true) }
            try {
                val page = branchRepository.getComments(taskId, 1, 20)
                _uiState.update {
                    it.copy(
                        comments = page.items,
                        commentTotal = page.total,
                        isLoadingComments = false
                    )
                }
            } catch (_: Exception) {
                _uiState.update { it.copy(isLoadingComments = false) }
            }
        }
    }

    private fun BranchOptionModel.toPreviewTask(): BranchTaskModel {
        val storyText = buildString {
            if (description.isNotBlank()) {
                append(description)
            } else {
                append("这是一个预设的固定分支结果。")
            }
            append("\n\n该方向会作为尾集后的另一种剧情延展进行展示。")
        }

        return BranchTaskModel(
            id = "fixed-$id",
            status = BranchTaskStatus.SUCCESS,
            userPrompt = title,
            resultTitle = title,
            resultHook = description.ifBlank { "预设分支已生成，可继续围观另一个结局。" },
            resultStory = storyText,
            storyboard = listOf(
                StoryboardScene(
                    scene = 1,
                    description = "尾集结束后，故事转向“$title”这一分支。",
                    duration = 6
                ),
                StoryboardScene(
                    scene = 2,
                    description = "角色关系与情绪冲突围绕该结局继续推进。",
                    duration = 8
                )
            ),
            likeCount = 0,
            commentCount = 0
        )
    }
}
