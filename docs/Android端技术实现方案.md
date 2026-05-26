# Drama Pulse Android 端技术实现方案

## 1. 文档目的

本文档基于以下文档抽取并收口 Android 端的实现方案：

- [开发顺序与任务拆解初稿.md](/Users/a0000/Desktop/项目文件/drama-pulse/docs/开发顺序与任务拆解初稿.md)
- [产品方案初稿.md](/Users/a0000/Desktop/项目文件/drama-pulse/docs/产品方案初稿.md)
- [技术方案初稿.md](/Users/a0000/Desktop/项目文件/drama-pulse/docs/技术方案初稿.md)

本文档目标：

- 单独冻结 Android 客户端的产品承载范围
- 明确播放主链路优先于高光丰富度
- 明确页面风格、交互风格和组件语言
- 明确代码分层、模块职责、状态机和数据流
- 作为后续 Android agent 开发的直接依据，尽量避免中途再改主结构

高光组件的视觉表现、观看保护规则和动效技术细节，统一以
[高光组件视觉与技术实现方案.md](/Users/a0000/Desktop/项目文件/drama-pulse/docs/高光组件视觉与技术实现方案.md)
为准。本方案中的高光章节与该文档保持一致，不再单独扩展出另一套组件口径。

## 2. Android 端定位

Android 客户端不是一个普通播放器壳子，而是本项目用户侧主体验的唯一承载端。

它需要同时承担：

- 短剧内容入口
- 视频播放与选集
- 高光互动承载
- 历史互动回流展示
- 尾集分支入口与结果展示
- 继续观看记录与本地缓存降级

第一版 Android 端必须坚持的原则：

- 先把播放链路做稳
- 再把高光互动挂上去
- 最后补尾集分支和视觉增强

## 3. 第一版范围冻结

### 3.1 P0 必做

- 短剧列表页
- 播放页
- 播放页内选集
- 播放/暂停/拖动/结束检测
- 继续观看恢复
- 高光列表加载
- 高光点时间轴触发
- 一主一辅互动展示
- 互动事件上报
- 历史互动热度与弹幕回流展示
- 尾集结束后固定分支入口
- 自定义分支任务创建、轮询与结果展示
- 分支结果页点赞与评论

### 3.2 第一版不做

- 横屏适配
- 登录体系
- 实时多人同屏互动
- 播放中插入剧情分叉
- 端上实时视频理解
- 端上实时视频生成

## 4. 实现优先级

Android 端严格按以下顺序实现：

1. 播放主链路
2. 高光触发链路
3. 历史互动回流
4. 尾集分支
5. 风格强化与动效增强

原因：

- 所有高光、弹幕、分支都依附于播放页
- 播放状态机不稳定，后面所有模块都会返工
- 先做播放主舞台，再叠加互动层，是当前项目最稳的技术路径

## 5. 设计风格定义

## 5.1 总体视觉方向

Android 端风格统一为：

`戏剧舞台感 + 爆点冲击感 + 短剧平台效率感`

这意味着：

- 页面基础层不能像传统工具后台那样平
- 也不能做成泛娱乐平台的标准白底卡片流
- 视觉重心始终围绕“内容正在上演”

设计关键词：

- 紧凑
- 锋利
- 有舞台聚光感
- 情绪色彩明确
- 层次分明但不杂乱

## 5.2 色彩系统

建议冻结为以下主色方向：

- 背景主色：`#0E1016`
- 内容面板：`#171A22`
- 主文本：`#F5F7FA`
- 次文本：`#9CA3AF`
- 强调色：`#FF5A36`
- 辅助高亮色：`#FFC247`
- 成功/确认：`#22C55E`
- 警告/悬念：`#F59E0B`
- 冷色辅助：`#46B8FF`

按高光类型映射：

- `feel_good`：橙红/金色
- `reversal`：冷白/裂变蓝
- `sweet`：暖粉/柔白
- `conflict`：赤红/震动边缘

## 5.3 字体与层级

不引入复杂字体方案，第一版使用系统字体，但层级要固定：

- 页面主标题：20sp semi-bold
- 区块标题：16sp semi-bold
- 正文：14sp regular
- 次级说明：12sp regular
- 时间轴/标签/按钮短文案：11-12sp medium

规则：

- 播放页尽量少大段文案
- 所有表达优先短句
- 标签、按钮和弹幕文案优先 4-6 字

## 5.4 动效语言

动效统一为：

- 快速出现
- 短时停留
- 干脆退出

禁止：

- 缓慢漂浮式默认动画
- 长时间停留遮挡视频
- 多层动画同时抢主视频画面

推荐动效：

- 主互动组件：底部弹入 + 轻缩放
- 点击反馈：粒子爆开 + 按钮瞬时压缩
- 历史弹幕：快速划入 + 轻透明过渡
- 尾集入口：下方卡片上浮 + 呼吸边框

## 6. 页面结构

Android 端第一版页面固定为 3 个一级页面：

- `DramaListScreen`
- `PlayerScreen`
- `BranchResultScreen`

不单独做重型详情页。

### 6.1 DramaListScreen

职责：

- 展示主打剧与备选剧
- 展示继续观看入口
- 进入某部剧默认播放目标集

页面内容：

- 顶部品牌区
- 主打剧大卡
- 备选剧列表
- 继续观看卡片

交互规则：

- 点主打剧直接进入最近进度对应集或第 1 集
- 点备选剧进入对应集

### 6.2 PlayerScreen

职责：

- 承载视频播放主流程
- 承载高光互动、历史回流、尾集入口

页面结构：

- 顶部栏：返回、剧名、集数、选集按钮
- 中部：视频播放器区域
- 底部播控：播放/暂停、进度条、时间、下一集
- 浮层：高光互动、历史弹幕、尾集入口

### 6.3 BranchResultScreen

职责：

- 展示固定分支结果
- 展示自定义分支生成中与生成完成结果
- 展示点赞评论

页面结构：

- 顶部：返回、标题
- 内容：固定分支视频或自定义结果卡片
- 底部：点赞、评论输入、评论列表

## 7. 播放主链路设计

## 7.1 主流程

Android 端播放主链路固定为：

`短剧列表 -> 选择短剧 -> 确定默认播放集 -> 拉取剧集列表 -> 拉取当前集详情 -> 初始化播放器 -> 开始播放 -> 定期保存进度 -> 切集/暂停/拖动 -> 当前集结束 -> 判断是否最后一集 -> 否则下一集 / 是则显示分支入口`

重点：

- 高光只是播放中的事件，不是播放页本体
- 所有高光和分支逻辑都依赖这条链路

## 7.2 播放页必须展示的内容

第一版播放页必须稳定展示：

- 视频画面
- 当前剧名
- 当前第几集
- 播放/暂停
- 进度条
- 当前播放时间 / 总时长
- 选集入口
- 加载中状态
- 播放失败状态
- 尾集结束后的分支入口

高光相关作为叠加层存在，不得破坏上述基本信息展示。

## 7.3 播放状态机

建议使用如下状态机：

- `Idle`
- `LoadingMeta`
- `PreparingPlayer`
- `Ready`
- `Playing`
- `Paused`
- `Seeking`
- `Buffering`
- `Error`
- `Ended`
- `BranchReady`

状态流转：

```text
Idle
 -> LoadingMeta
 -> PreparingPlayer
 -> Ready
 -> Playing
 -> Paused / Seeking / Buffering
 -> Playing
 -> Ended
 -> BranchReady (if final episode)
```

异常流转：

- `LoadingMeta -> Error`
- `PreparingPlayer -> Error`
- `Playing -> Error`

## 7.4 播放关键规则

规则 1：进入播放页先决定播放目标集

优先级：

`继续观看记录 > 外部指定 episodeId > 第 1 集`

规则 2：切集必须重置所有播放会话态

必须清理：

- 当前播放器媒体源
- 当前集进度
- 已触发高光集合
- 当前互动浮层
- 尾集入口展示态

规则 3：拖动进度条时不触发主互动

规则 4：以下时机要保存观看进度

- 暂停
- 切后台
- 切集前
- 每隔固定时间自动保存

规则 5：当前集播放结束后优先判断是否最后一集

- 非尾集：展示“下一集”
- 尾集：展示“进入分支”

规则 6：所有播放异常都必须允许用户安全返回或切集

## 8. 高光互动设计

## 8.1 加载策略

进入 `PlayerScreen` 后：

1. 拉取当前集详情
2. 拉取当前集高光列表
3. 缓存高光列表到内存
4. 准备播放

高光数据只消费：

- `status = confirmed`

## 8.2 触发策略

触发条件：

- 当前播放进度进入 `interactionAppearMs`
- 当前高光未在本次会话内触发过
- 当前不处于 `Seeking`
- 当前不处于 `Paused`

触发规则：

- 组件露出以 `interactionAppearMs` 为准
- 用户可点击窗口以 `interactionStartMs..interactionEndMs` 为准
- 每个高光点只触发 1 个主互动
- 允许 1 个辅助反馈
- 同屏最多 1 个主互动组件

## 8.3 高光点过近规则

当前冻结为：

- 两个高光点都保留
- 如果间隔过近，后一个只展示弱提示或轻反馈
- 不连续弹完整主互动组件

实现建议：

- 维护 `lastStrongHighlightAt`
- 若当前高光与上一个强互动高光间隔小于阈值，则降级为 `WeakPrompt`

## 8.4 互动表现

第一版客户端按高光类型固定支持以下 4 类核心表现：

- `feel_good`：`爽` 字组件
- `reversal`：`卧槽` 字组件
- `conflict`：火焰燃烧组件
- `sweet`：爱心组件

强度规则：

- `intensity 1-2`：轻量选项态或轻浮层
- `intensity 3`：标准类别组件
- `intensity 4-5`：强视觉类别组件

## 9. 历史互动回流设计

## 9.1 展示原则

- 不做真实实时弹幕
- 只做历史互动回流
- 历史回流强度低于主互动组件
- 不干扰视频主体观看

## 9.2 展示层结构

建议拆为两个层次：

- `HeatHintLayer`
- `HistoryDanmakuLayer`

`HeatHintLayer`

- 显示该高光点热度
- 显示热门选项

`HistoryDanmakuLayer`

- 根据服务端返回的历史文本或选项映射文案渲染弹幕
- 在高光时刻短时增强

## 9.3 与主互动的关系

建议策略：

- 高光到来时先弱展示热度氛围
- 用户点击后再增强群体反馈
- 若用户未点击，历史回流也应自动淡出

## 10. 尾集分支设计

## 10.1 入口规则

第一版只在最后一集结束后出现分支入口。

条件：

- 当前 episode `isFinalEpisode = true`
- 播放状态进入 `Ended`

此时状态切换为：

- `BranchReady`

## 10.2 固定分支

固定分支流程：

1. 请求 `/episodes/:episodeId/branch-options`
2. 展示 2 个固定方向卡片
3. 点击后进入 `BranchResultScreen`
4. 播放预置结果视频

## 10.3 自定义分支

自定义分支流程：

1. 输入 Prompt
2. 调用 `POST /branch-tasks`
3. 显示任务创建成功
4. 轮询 `GET /branch-tasks/:taskId`
5. 成功后展示结果标题、hook、剧情、分镜

输入约束：

- 以服务端规则为准
- 客户端仍应提供明确字数提示和输入建议

## 10.4 分支结果页

固定分支：

- 主要展示视频结果

自定义分支：

- 主要展示结构化结果
- 分区展示 `title / hook / story / storyboard`

评论与点赞：

- 只存在于分支结果页
- 不延伸到播放页高光互动

## 11. Android 代码分层

## 11.1 目录结构

建议采用如下结构：

```text
android-app/app/src/main/java/com/dramapulse/app/
├── app/
│   ├── AppNavHost.kt
│   ├── AppRoutes.kt
│   └── DramaPulseApp.kt
├── core/
│   ├── design/
│   ├── player/
│   ├── model/
│   ├── network/
│   ├── data/
│   ├── cache/
│   └── util/
├── feature/
│   ├── drama_list/
│   ├── player/
│   ├── episode_selector/
│   ├── highlight/
│   ├── interaction/
│   └── branch/
└── ui/
    ├── component/
    ├── overlay/
    └── theme/
```

## 11.2 分层职责

`app/`

- 导航注册
- 应用入口

`core/model`

- DTO
- UI State
- Domain Model

`core/network`

- Retrofit
- OkHttp
- API interfaces

`core/data`

- Repository 实现
- DTO -> Domain 映射

`core/player`

- ExoPlayer 封装
- 时间轴监听
- 播放状态桥接

`feature/*`

- 各页面 ViewModel
- 页面级 UI State
- 页面交互逻辑

`ui/component`

- 通用按钮、卡片、标签、进度条

`ui/overlay`

- 高光组件
- 热度提示
- 历史弹幕
- 分支入口卡片

## 12. 核心代码对象设计

## 12.1 Domain Model

建议至少定义：

- `DramaUiModel`
- `EpisodeUiModel`
- `HighlightUiModel`
- `HighlightStatsUiModel`
- `BranchOptionUiModel`
- `BranchTaskUiModel`
- `BranchCommentUiModel`

## 12.2 ViewModel

第一版至少拆为：

- `DramaListViewModel`
- `PlayerViewModel`
- `BranchViewModel`

职责：

`DramaListViewModel`

- 拉取短剧列表
- 处理继续观看入口

`PlayerViewModel`

- 当前剧 / 当前集 / 高光 / 播放状态
- 进度保存
- 高光触发
- 互动上报
- 尾集判断

`BranchViewModel`

- 固定分支列表
- 自定义任务创建
- 任务轮询
- 点赞评论

## 12.3 PlayerController

不建议把 ExoPlayer 直接散落在 Compose 页面中。

建议抽象 `PlayerController`：

职责：

- 初始化和释放 ExoPlayer
- 设置媒体源
- 监听播放进度
- 暴露播放状态流
- 暴露结束事件
- 暴露错误事件

建议接口：

```kotlin
interface PlayerController {
    val playbackState: StateFlow<PlaybackUiState>
    fun attach(mediaUrl: String, startPositionMs: Long = 0L)
    fun play()
    fun pause()
    fun seekTo(positionMs: Long)
    fun release()
}
```

## 12.4 Repository

建议定义接口后再实现：

```kotlin
interface ContentRepository
interface HighlightRepository
interface InteractionRepository
interface BranchRepository
interface ProgressRepository
```

好处：

- 便于 Mock
- 便于后续缓存和联调切换
- ViewModel 不直接依赖 Retrofit

## 13. API 对接映射

Android 端需要直接消费这些接口：

- `GET /dramas`
- `GET /dramas/:dramaId/episodes`
- `GET /episodes/:episodeId`
- `GET /episodes/:episodeId/highlights`
- `POST /interactions`
- `GET /episodes/:episodeId/branch-options`
- `POST /branch-tasks`
- `GET /branch-tasks/:taskId`
- `POST /branch-tasks/:taskId/likes`
- `POST /branch-tasks/:taskId/comments`
- `GET /branch-tasks/:taskId/comments`
- `GET /users/:userId/watch-progress`
- `POST /users/:userId/watch-progress`

请求头约定：

- 必须带 `x-device-id`

## 13.1 页面到接口映射

`DramaListScreen`

- `GET /dramas`
- 首页若服务端已返回继续观看摘要，则不额外请求观看进度详情

`PlayerScreen`

- `GET /dramas/:dramaId/episodes`
- `GET /episodes/:episodeId`
- `GET /episodes/:episodeId/highlights`
- `POST /interactions`
- `POST /users/:userId/watch-progress`

`BranchResultScreen`

- `GET /episodes/:episodeId/branch-options`
- `POST /branch-tasks`
- `GET /branch-tasks/:taskId`
- `POST /branch-tasks/:taskId/likes`
- `POST /branch-tasks/:taskId/comments`
- `GET /branch-tasks/:taskId/comments`

## 13.2 DTO 定义建议

建议在 `core/model/remote/` 下定义远程 DTO，严格贴合服务端返回。

至少包括：

- `DramaListResponseDto`
- `DramaDto`
- `EpisodeDto`
- `HighlightDto`
- `HighlightStatsDto`
- `BranchOptionDto`
- `BranchTaskDto`
- `BranchCommentDto`
- `PaginatedResponseDto<T>`

约定：

- DTO 保持服务端字段语义
- 页面层不直接使用 DTO
- `Repository` 负责 DTO -> Domain / UiModel 映射

## 13.3 DTO 到 UI Model 映射

必须单独保留映射层，避免 ViewModel 直接处理服务端字段。

建议至少存在这些映射：

- `DramaDto -> DramaCardUiModel`
- `EpisodeDto -> EpisodeUiModel`
- `HighlightDto -> HighlightUiModel`
- `BranchOptionDto -> BranchOptionUiModel`
- `BranchTaskDto -> BranchTaskUiModel`
- `BranchCommentDto -> BranchCommentUiModel`

映射层负责：

- 处理 URL / path 差异
- 将枚举映射为 UI 可识别类型
- 处理可空字段默认值
- 预处理时间文本和状态文案

## 13.4 关键字段解释

`Highlight.interactionOptionsJson`

- 建议在 Repository 层解析成 `List<HighlightOptionUiModel>`
- 页面不允许到处手写 JSON 解析

`Highlight.type`

- 只能映射到固定类别组件
- 未识别类型统一降级为 `feel_good` 轻量态

`Highlight.stats.heatLevel`

- 控制热度提示强度、历史弹幕密度、局部特效强度

`Episode.isFinalEpisode`

- 决定播放结束后是显示“下一集”还是“进入分支”

`BranchTask.status`

- `pending/running`：展示生成中
- `success`：展示结果页
- `failed/timeout/blocked`：展示异常态

## 14. 页面状态流转

## 14.1 DramaListScreen 状态

- `Idle`
- `Loading`
- `Content`
- `Empty`
- `Error`

关键事件：

- `OnEnter`
- `OnRetry`
- `OnDramaClick`
- `OnContinueWatchingClick`

## 14.2 PlayerScreen 状态流转图

```text
EnterScreen
 -> LoadDramaEpisodes
 -> ResolveTargetEpisode
 -> LoadEpisodeDetail
 -> LoadHighlights
 -> PreparePlayer
 -> Ready
 -> Playing
    -> Pause
    -> Seek
    -> Buffering
    -> HighlightTriggered
    -> EpisodeEnded
 -> NextEpisodeReady / BranchReady
 -> Error
```

关键事件：

- `OnPlayerReady`
- `OnProgressTick`
- `OnSeekStart`
- `OnSeekEnd`
- `OnHighlightHit`
- `OnInteractionClick`
- `OnEpisodeComplete`
- `OnPlayNextEpisode`
- `OnShowBranchEntry`

## 14.3 BranchResultScreen 状态

固定分支：

- `LoadingOption`
- `ShowingFixedResult`
- `FixedResultError`

自定义分支：

- `CreatingTask`
- `PollingTask`
- `TaskSuccess`
- `TaskFailed`

评论区：

- `CommentsLoading`
- `CommentsContent`
- `CommentsEmpty`
- `CommentsError`

## 14.4 PlayerViewModel 状态拆分建议

不要把所有状态塞成一个大对象。

建议拆分为：

- `PlayerMetaState`
- `PlaybackState`
- `HighlightUiState`
- `OverlayUiState`
- `BranchEntryState`

这样更适合 Compose 局部刷新，也更利于多个 agent 分工。

## 15. 组件清单与页面结构说明

## 15.1 第一版必须实现的组件

基础组件：

- `DramaCard`
- `ContinueWatchingCard`
- `AppTopBar`
- `PrimaryChip`
- `StatusHint`
- `LoadingPanel`
- `ErrorPanel`

播放页组件：

- `PlayerTopBar`
- `PlayerControlBar`
- `ProgressSlider`
- `EpisodeSelectorSheet`
- `NextEpisodeCard`

高光互动组件：

- `HighlightPromptCard`
- `EmotionButtonGroup`
- `VoteSidePanel`
- `BoostActionButton`
- `SuspensePromptCard`
- `HighlightWeakHint`

历史回流组件：

- `HeatHintBanner`
- `HistoryDanmakuLane`
- `DanmakuItem`

分支组件：

- `BranchEntryCard`
- `BranchOptionCard`
- `BranchTaskStatusCard`
- `BranchStoryCard`
- `StoryboardCard`
- `LikeActionBar`
- `CommentComposer`
- `CommentList`

## 15.2 组件职责边界

规则：

- `feature/*` 负责页面组装和事件分发
- `ui/component/*` 不直接感知业务接口
- `ui/overlay/*` 可感知高光类别与强度，但不直接发请求

## 15.3 Compose 代码风格约定

- 页面函数只做结构编排，不堆复杂业务逻辑
- 业务状态流转放入 ViewModel
- 样式优先抽到 `ui/theme` 或基础组件
- 默认不滥用 `remember` / `derivedStateOf`
- 只有在重组成本明显时再做局部优化

## 16. 本地缓存与降级

第一版建议引入 `Room`，但缓存范围保持克制。

建议缓存：

- 短剧列表
- 剧集列表
- 当前集高光列表
- 最近一次分支任务结果摘要
- 最近观看进度

缓存目标：

- 页面快速恢复
- 服务端短时失败时能弱降级

不建议第一版缓存：

- 全量评论
- 全量互动事件

## 16.1 存储位置建议

| 数据项 | 来源 | 存储位置 | 说明 |
| --- | --- | --- | --- |
| 短剧列表 | `/dramas` | Room + 内存 | 首页首屏数据 |
| 剧集列表 | `/dramas/:id/episodes` | Room + 内存 | 切集基础数据 |
| 当前集详情 | `/episodes/:id` | 内存 | 页面级即可 |
| 当前集高光 | `/episodes/:id/highlights` | Room + 内存 | 支撑回放与弱网恢复 |
| 观看进度 | 本地 + `/watch-progress` | Room | 本地优先，服务端同步 |
| 分支任务摘要 | `/branch-tasks/:id` | Room | 方便返回查看 |
| 评论列表 | `/comments` | 内存 | 第一版不做重缓存 |

## 16.2 读取优先级

建议统一策略：

- 首次进入页面：`缓存先出 + 网络刷新`
- 播放页切集：`优先网络，失败时读缓存`
- 分支结果页：`网络优先，失败时回退到最近缓存摘要`

## 16.3 失效策略

- 短剧列表：应用重启后允许复用，进入首页时后台刷新
- 高光列表：切集必刷新；失败时允许回退本地缓存
- 观看进度：本地实时更新，服务端异步同步

## 17. Mock 与联调规则

## 17.1 实现阶段约定

为了支持多个 agent 并行：

- 页面结构阶段允许使用 fake repository
- 联调阶段必须切到真实 repository
- fake repository 返回结构必须对齐真实 DTO

## 17.2 允许 Mock 的范围

可先 Mock：

- 列表页静态展示
- 播放页基础布局
- 高光组件样式
- 分支结果页布局

必须真接服务端后才算完成：

- 剧集列表与选集
- 进度保存
- 高光加载
- 互动上报
- 分支任务轮询
- 点赞评论

## 17.3 Mock 数据约束

- 只使用主打剧和备选剧
- 高光类型必须来自正式枚举
- 分支状态必须来自正式状态枚举
- 不允许 agent 自行扩展字段名

## 18. Agent 开发交付标准

## 18.1 模块级交付要求

每个 Android 模块交付时至少满足：

- 可编译
- 可运行
- 有基础空态
- 有基础错误态
- 与当前文档字段口径一致
- 不新增未约定字段名和状态名

## 18.2 播放模块交付标准

- 能从列表进入播放页
- 能拉取剧集与当前集信息
- 能实际播放视频
- 能暂停、拖动、切集
- 能检测最后一集结束

## 18.3 高光模块交付标准

- 能按时间命中高光
- 能展示主互动组件
- 能处理过近高光弱化
- 点击后能本地反馈并上报

## 18.4 历史互动模块交付标准

- 能根据 `heatLevel` 展示热度提示
- 能展示至少一条历史互动弹幕
- 不遮挡播控核心区域

## 18.5 分支模块交付标准

- 尾集结束后显示入口
- 固定分支可进入结果页
- 自定义任务可创建并轮询
- 结果页可点赞和评论

## 19. 错误与异常处理

必须覆盖：

- 剧集加载失败
- 视频准备失败
- 视频播放失败
- 高光接口失败
- 互动上报失败
- 分支任务创建失败
- 分支轮询失败
- 评论提交失败

策略：

- 播放相关错误优先保证可回退、可换集
- 非阻塞错误使用 Toast 或轻提示
- 分支错误不影响播放主流程

## 20. 开发任务拆解

## 20.1 阶段一：客户端骨架

- 补齐 Navigation
- 补齐 Retrofit/OkHttp
- 补齐 Media3
- 建立目录结构
- 建立 AppTheme 和设计 Tokens

## 20.2 阶段二：播放主链路

- 列表页
- 播放页
- 选集切换
- 进度保存与恢复
- 尾集结束检测

## 20.3 阶段三：高光互动

- 拉取高光
- 时间轴触发
- 主互动组件
- 辅助反馈
- 互动上报

## 20.4 阶段四：历史互动回流

- 热度展示
- 历史弹幕展示
- 点击后刷新局部统计

## 20.5 阶段五：尾集分支

- 固定分支入口
- 固定分支结果页
- 自定义分支任务
- 点赞评论

## 21. 完成标准

当满足以下条件时，Android 端可视为完成第一版：

- 能展示短剧列表
- 能进入播放页并稳定播放
- 能切集和恢复观看进度
- 能在指定时间触发高光互动
- 点击互动后有明确反馈并可上报
- 能展示历史热度和回流弹幕
- 能在最后一集结束后展示分支入口
- 能查看固定分支结果
- 能创建并查看自定义分支结果
- 能在分支结果页点赞和评论

## 22. 当前结论

Android 端当前最重要的不是继续发散高光细节，而是先把以下三件事做稳：

- 播放页信息结构
- 播放状态机
- 播放事件流转

只有这三件事稳定后，高光互动、历史回流、尾集分支才能真正低风险挂上去。
