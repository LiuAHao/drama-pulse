package com.dramapulse.app.core.data

import com.dramapulse.app.core.model.*

class FakeBranchRepository : BranchRepository {

    override suspend fun getBranchOptions(episodeId: String): List<BranchOptionModel> {
        return listOf(
            BranchOptionModel(
                id = "bo-1",
                title = "温情结局",
                description = "主角收获温暖关系与圆满收场",
                resultType = "image_story",
                coverUrl = "",
                resultContentUrl = "",
                generatedPayloadUrl = "https://example.com/fixed-branch-1.json",
                resultHook = "她终于决定把真话说给最该听的人。",
                resultStory = "这是一个预设固定分支的示例故事。",
                storyboardCards = listOf(
                    StoryboardCard(
                        scene = 1,
                        sceneTitle = "分支起点",
                        imageUrl = "https://example.com/fixed-scene-1.png",
                        narrationText = "她鼓起勇气开口，没有再把那句话咽回去。",
                        dialogueText = "这次我自己来说。",
                        order = 1,
                        endingCard = false
                    ),
                    StoryboardCard(
                        scene = 2,
                        sceneTitle = "推进 2",
                        imageUrl = "https://example.com/fixed-scene-2.png",
                        narrationText = "所有人第一次站到她这一边，原本僵住的局面也开始松动。",
                        dialogueText = "",
                        order = 2,
                        endingCard = true
                    )
                )
            ),
            BranchOptionModel(
                id = "bo-2",
                title = "反转结局",
                description = "一个意想不到的结局",
                resultType = "image_story",
                coverUrl = "",
                resultContentUrl = "",
                generatedPayloadUrl = "https://example.com/fixed-branch-2.json",
                resultHook = "她没有照着所有人的预期落子。",
                resultStory = "这是另一个预设固定分支的示例故事。",
                storyboardCards = listOf(
                    StoryboardCard(
                        scene = 1,
                        sceneTitle = "分支起点",
                        imageUrl = "https://example.com/reversal-scene-1.png",
                        narrationText = "她先故意示弱，把所有人的注意力往错处带。",
                        dialogueText = "",
                        order = 1,
                        endingCard = false
                    ),
                    StoryboardCard(
                        scene = 2,
                        sceneTitle = "结局收口",
                        imageUrl = "https://example.com/reversal-scene-2.png",
                        narrationText = "真正的反击在暗处开始，等所有人回过神时，局面已经被她改写。",
                        dialogueText = "现在该轮到我了。",
                        order = 2,
                        endingCard = true
                    )
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
            failReason = "",
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
            failReason = "",
            storyboard = listOf(
                StoryboardScene(1, "开场：主角登场", 5),
                StoryboardScene(2, "转折：意外发生", 8),
                StoryboardScene(3, "结局：圆满收场", 6)
            ),
            storyboardCards = listOf(
                StoryboardCard(
                    scene = 1,
                    sceneTitle = "分支起点",
                    imageUrl = "https://example.com/custom-scene-1.png",
                    narrationText = "她回到现场时，没有再照着所有人给她安排的节奏走。",
                    dialogueText = "这次我自己选结局。",
                    order = 1,
                    endingCard = false
                ),
                StoryboardCard(
                    scene = 2,
                    sceneTitle = "推进 2",
                    imageUrl = "https://example.com/custom-scene-2.png",
                    narrationText = "意外发生后，她顺势把最关键的真相从混乱里拽了出来。",
                    dialogueText = "",
                    order = 2,
                    endingCard = false
                ),
                StoryboardCard(
                    scene = 3,
                    sceneTitle = "结局收口",
                    imageUrl = "https://example.com/custom-scene-3.png",
                    narrationText = "局面被她改写之后，原本的终点也自然换了方向。",
                    dialogueText = "到这里，才算真的结束。",
                    order = 3,
                    endingCard = true
                )
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
