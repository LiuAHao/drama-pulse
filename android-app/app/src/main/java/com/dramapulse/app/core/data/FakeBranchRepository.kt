package com.dramapulse.app.core.data

import com.dramapulse.app.core.model.*

class FakeBranchRepository : BranchRepository {

    override suspend fun getBranchOptions(episodeId: String): List<BranchOptionModel> {
        return listOf(
            BranchOptionModel(
                id = "bo-1",
                title = "温情结局",
                description = "主角收获温暖关系与圆满收场",
                resultType = "video",
                coverUrl = "",
                resultContentUrl = "",
                resultHook = "她终于决定把真话说给最该听的人。",
                resultStory = "这是一个预设固定分支的示例故事。",
                storyboard = listOf(
                    StoryboardScene(1, "她鼓起勇气开口", 4),
                    StoryboardScene(2, "所有人第一次站到她这一边", 6)
                )
            ),
            BranchOptionModel(
                id = "bo-2",
                title = "反转结局",
                description = "一个意想不到的结局",
                resultType = "video",
                coverUrl = "",
                resultContentUrl = "",
                resultHook = "她没有照着所有人的预期落子。",
                resultStory = "这是另一个预设固定分支的示例故事。",
                storyboard = listOf(
                    StoryboardScene(1, "她故意示弱", 4),
                    StoryboardScene(2, "真正的反击在暗处开始", 6)
                )
            )
        )
    }

    override suspend fun createBranchTask(episodeId: String, userPrompt: String): BranchTaskModel {
        return BranchTaskModel(
            id = "bt-fake-${System.currentTimeMillis()}",
            status = BranchTaskStatus.PENDING,
            userPrompt = userPrompt,
            resultTitle = "",
            resultHook = "",
            resultStory = "",
            storyboard = emptyList(),
            storyboardImages = emptyList(),
            likeCount = 0,
            commentCount = 0
        )
    }

    override suspend fun getBranchTask(taskId: String): BranchTaskModel {
        return BranchTaskModel(
            id = taskId,
            status = BranchTaskStatus.SUCCESS,
            userPrompt = "自定义结局",
            resultTitle = "AI 生成的故事",
            resultHook = "当意外发生时，一切都改变了...",
            resultStory = "一个基于你的想法生成的短篇故事。",
            storyboard = listOf(
                StoryboardScene(1, "开场：主角登场", 5),
                StoryboardScene(2, "转折：意外发生", 8),
                StoryboardScene(3, "结局：圆满收场", 6)
            ),
            storyboardImages = emptyList(),
            likeCount = 12,
            commentCount = 5
        )
    }

    override suspend fun likeBranchTask(taskId: String): Int = 13

    override suspend fun createComment(taskId: String, content: String): BranchCommentModel {
        return BranchCommentModel(
            id = "comment-${System.currentTimeMillis()}",
            content = content,
            createdAt = "2025-01-01T00:00:00Z"
        )
    }

    override suspend fun getComments(taskId: String, page: Int, pageSize: Int): BranchCommentPage {
        return BranchCommentPage(
            items = listOf(
                BranchCommentModel("c1", "太好看了！", "2025-01-01T00:00:00Z"),
                BranchCommentModel("c2", "结局意想不到", "2025-01-01T00:01:00Z")
            ),
            total = 2,
            page = 1,
            totalPages = 1
        )
    }
}
