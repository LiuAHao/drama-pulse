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

关于高光真实素材如何生成、拆分和接入，统一以
[高光资产生成与接入方案.md](/Users/a0000/Desktop/项目文件/drama-pulse/docs/高光资产生成与接入方案.md)
为准。

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
- `funny`：明黄/活力橙
- `reversal`：冷白/裂变蓝
- `sweet`：暖粉/柔白，偏温情而非恋爱甜宠
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
- 同一时刻仍只激活 1 个当前命中高光
- 不再因为“距离上一个强高光太近”而自动改写它的强度

实现建议：

- 通过时间轴命中和优先级排序决定当前激活项
- 客户端只消费最终 `intensity`：`< 3 -> 分组弹幕 / 云朵弹幕`，`>= 3 -> 正式交互组件`

## 8.4 互动表现

第一版客户端按高光类型固定支持以下 5 类核心表现：

- `feel_good`：`爽` 字组件
- `funny`：`哈 / 哈哈哈` 笑点组件
- `reversal`：`卧槽` 字组件
- `conflict`：火焰燃烧组件
- `sweet`：温情爱心组件

强度规则：

- `intensity 1-2`：轻量选项态或轻浮层
- `intensity 3`：标准类别组件
- `intensity 4-5`：强视觉类别组件

统一交互骨架：

- 默认只露出中下区域偏中的小触发按钮
- 用户点击后才进入该类型的完整峰值效果
- 点击结果同时写入互动事件，并可在后续回流为弹幕
- 同一个高光在有效窗口内允许重复点击，但完整重特效要限流

## 8.5 五类组件的 Android 技术设计

### 8.5.1 `feel_good` 爽点

产品目标：

- 让用户立刻感到“解气、反杀、出了口气”
- 视觉要有爆开感和胜利感，但不能大面积压住视频主体

默认态：

- 中下区域出现一个小型触发按钮
- 按钮文案可用“爽一下”“这波可以”“点一下”
- 本体偏橙金，外圈有轻微呼吸光晕

点击后：

- 中心主字以 `爽` 为核心短时放大
- 底部到两侧出现短促亮斑、碎光和冲击波
- 视频边缘允许少量 `爽` 字作为符号化效果短时浮现

技术落地：

- 默认态用 Compose 绘制
- 主字峰值和爆开光效优先走 `Lottie` 或 `Rive`
- 边缘 `爽` 字扩散由 Compose 粒子或轻量序列帧承载

### 8.5.2 `funny` 笑点

产品目标：

- 让用户直觉感到“绷不住了、这段太逗了”
- 视觉气质要轻快、灵动、会抖包袱，不能做成普通黄色按钮

默认态：

- 中下区域出现一个小型触发按钮
- 按钮文案可用“笑点来了”“绷不住了”“点一下”
- 按钮本体有轻微弹跳感，但默认振幅要克制

点击后：

- 中心主字以 `哈` 或 `哈哈哈` 为主，走弹跳和轻旋
- 周围出现少量上浮的 `哈` 字和小笑脸式粒子
- 扩散以向上漂、连锁轻弹为主，不走爆燃式冲击

技术落地：

- 当前第一版已落地为 `Compose + 透明 PNG` 方案，不再等 `Rive` 先行
- 按钮本体、中心大 `哈`、右上 `哈哈哈` 气泡、边缘 `哈哈` / 星点均由静态素材叠加
- 按钮呼吸、中心主视觉轻呼吸、点击后边缘随机分发都由 Compose 控制

首轮落地后的当前口径：

- 默认态只显示中下触发按钮
- 按钮位置沿用 `reversal` 的底部宿主位，不额外发明新布局
- 按钮可重复点击，不会点击一次后消失整轮逻辑
- 点击后固定出现：
  - 中间大 `哈`
  - 右上 `哈哈哈` 对话框
- 点击后随机出现：
  - 边缘小 `哈哈`
  - 少量星形和点状装饰

当前 funny 的实现约束：

- 中间大 `哈` 和右上对话框不参与随机运动
- 边缘分区虽然沿用反转的“分区刷出”思想，但会避开中下中轴，避免被主大 `哈` 挡住
- `哈哈` 小字的权重要明显高于星星和圆点，笑点的热闹感主要靠文字扩散，不靠粒子堆量
- 参数仍集中在 `HighlightOverlay.kt` 中，后续可以继续直接在 Android Studio 里手调大小、底部偏移和边缘密度

### 8.5.3 `reversal` 反转

产品目标：

- 让用户立刻意识到“卧槽，剧情翻了”
- 要有突然停顿后爆开的感觉，节奏上先收再放

默认态：

- 中下区域出现一个小型触发按钮
- 按钮文案统一朝“反转来了”“这下不对劲”“点一下”收口
- 默认态不要直接出现大面积裂纹和强光
- 默认态只保留按钮、弱能量环和轻微冷白氛围

点击后：

- 中心主字以 `卧槽 / WOC` 为主，先轻停顿再翻牌放大
- 两侧边缘短时出现少量 `卧槽 / WOC` 小字、裂片和冷白闪光
- 整体峰值更强调骤变和意外，而不是持续燃烧

资产映射：

- `highlight_reversal_button_primary_user_v1` 作为中心按钮
- `highlight_reversal_energy_ring` 作为底层能量环
- `highlight_reversal_crack_cluster` 作为点击爆发层
- `highlight_reversal_edge_woc_v1` / `highlight_reversal_edge_woc_v2` 作为边缘回声层

技术落地：

- 当前优先用 `Compose + 静态透明 PNG` 叠加实现，先保证效果稳定和可调
- 旋转、轻脉冲、淡入淡出和点击爆发都由 Compose 控制
- 若后续要升级更复杂的翻牌或分层过渡，再评估 `Rive`

首轮落地后需要记住的工程经验：

- `reversal` 当前已经验证，按钮宿主放在中下区域是成立的，后续强互动高光可优先复用这套按钮位置策略
- 位置复用的是“宿主区”和“调参方式”，不是整套视觉模板
- `HighlightOverlay.kt` 里集中暴露可手调参数这一点很重要，后续其他类型也建议保留
- 当前反转组件的可复用骨架是：
  `按钮出现 -> 按钮轻呼吸引导 -> 点击后中心主图放大 -> 边缘素材随机分布 -> 点击爆发层短时叠加 -> 自动淡出`
- 这条骨架适合 `reversal`、`conflict` 这类强互动类型
- `sweet`、`feel_good`、`funny` 不一定适合整套照搬，尤其不建议复用反转的骤停爆裂节奏

不建议复用的部分：

- 冷白裂片和爆闪风格
- 大量边缘回声字
- 明显“翻牌式”骤停后爆发节奏

建议优先复用的部分：

- 中下按钮宿主位置
- 统一的点击热区尺寸策略
- `Compose` 控制的轻呼吸、淡入淡出、边缘随机分发框架
- “中心主视觉和边缘素材分层”这一工程组织方式

### 8.5.4 `conflict` 冲突

产品目标：

- 强调对撞、拉扯、上火、情绪对峙
- 冲击感要明显，但仍然要把视频主体让出来

默认态：

- 中下区域出现一个小型触发按钮
- 按钮文案可用“有火药味”“点一下”“烧起来了”
- 默认态主要表现为暗红外圈与轻微热浪，不直接满屏喷火

点击后：

- 中心触发火焰能量上涌
- 屏幕两侧或下边缘出现火线、火花、余烬和热浪轻震
- 重点是边缘燃烧氛围，不是中心大块遮挡

技术落地：

- 主按钮仍由 Compose 承载点击区
- 火焰、余烬、热浪边缘素材建议使用 Lottie 或 webp 序列帧
- 点击时可配合一次短振

### 8.5.5 `sweet` 温情

产品目标：

- 传达的是“心暖、被触动、心软了一下”
- 爱心可以保留，但语义绝不能做成恋爱甜宠

默认态：

- 中下区域出现一个小型触发按钮
- 按钮文案统一朝“心暖一下”“被触动了”“点一下”收口
- 默认态保持柔光和安静，不要高饱和粉色恋爱感

点击后：

- 中心主图以柔和爱心、暖光、呼吸扩散为主
- 视频边缘可出现小爱心上浮和淡淡暖光
- 效果强调柔、暖、散开，不强调强烈爆发

技术落地：

- 主体建议用 Lottie 表现柔光和爱心节奏
- 小爱心上浮可走 Compose 多实例动画
- 文案避免“嗑到了”“锁死”等恋爱化表达

## 8.6 组件状态机

每个高光组件统一走以下状态：

- `Hidden`
- `TeaseVisible`
- `Interactive`
- `BurstFeedback`
- `CoolingDown`
- `Dismissed`

状态定义：

- `Hidden`：未到 `interactionAppearMs`
- `TeaseVisible`：已出现默认触发按钮，但可能尚未进入可点击窗口
- `Interactive`：位于 `interactionStartMs..interactionEndMs`，允许点击
- `BurstFeedback`：点击后进入短时峰值表现
- `CoolingDown`：峰值后保留弱反馈，允许再次点击
- `Dismissed`：超过 `interactionEndMs` 或被更高优先级高光替换

重复点击规则：

- 每次点击都要产生即时反馈
- 峰值动画不完整重播，而是进入受控的增量反馈
- 单高光点击峰值强度最多提升到 3 档，避免越点越乱

## 8.7 类型、强度与组件映射

Android 端不再依赖旧 `templateId` 决定视觉表现，而统一由：

- `type`
- `intensity`
- `interactionAppearMs`
- `interactionStartMs`
- `interactionEndMs`
- `interactionOptions`

共同驱动。

推荐映射：

- `intensity 1`：`HighlightWeakHint`
- `intensity 2`：`QuickSendPrompt`
- `intensity 3`：`TypeTriggerCard + StandardEffectLayer`
- `intensity 4-5`：`TypeTriggerCard + ImpactEffectLayer + EdgeAtmosphereLayer`

类型组件：

- `feel_good` -> `FeelGoodOverlay`
- `funny` -> `FunnyOverlay`
- `reversal` -> `ReversalOverlay`
- `conflict` -> `ConflictOverlay`
- `sweet` -> `SweetOverlay`

## 8.7.1 点击音效映射

高光按钮点击后，除了视觉反馈，还应补一层极短音效。

第一版建议直接按类型固定映射，不做复杂的动态音频拼接：

- `reversal`
  - 惊讶向短人声，如“卧槽！”
- `funny`
  - 多人短促笑声，如“哈哈哈”
- `feel_good`
  - 干脆利落的“爽！”或类似短促喝彩
- `sweet`
  - 温情向轻人声，如“好暖心”或更柔和的暖意提示音
- `conflict`
  - 火焰燃烧 / 情绪点燃类短音效

当前原则：

- 音效长度必须短，优先 `300ms ~ 900ms`
- 只承担点击确认和情绪补刀，不抢视频原声
- 默认音量应低于视频主声道
- 同类高光可重复点击时，允许重复播放，但要避免叠出刺耳爆音
- `sweet` 的对外产品语义统一按“温情”理解，音效也走温暖、被触动的方向，不走甜宠撒糖感

## 8.8 与真实播放页的挂接方式

高光组件不是独立 Demo，而是直接挂在 `PlayerScreen` 的视频层之上。

推荐叠层顺序：

1. `AndroidView(PlayerView)`
2. `HistoryDanmakuLayer`
3. `HeatHintOverlay`
4. `HighlightStage`
5. `PlayerTopBar / PlayerBottomBar / SideActions`
6. `EpisodeSelector / BranchEntry / CommentsSheet`

规则：

- 高光组件只覆盖视频区域，不把整页 UI 一起卷入动画
- 页面退出时，高光宿主必须跟随播放页一起销毁
- 调试预览也走真实 `PlayerScreen`，而不是脱离播放器单独看白底静态 Demo
- 低强度高光当前采用“云朵式一键弹幕”实现，挂载在 `HighlightStage`
- 低强度云朵层的实际调参入口集中在 `HighlightOverlay.kt`，便于直接在 Android Studio 中手调位置、字号、宽度和行距

补充一条通用规则：

- 后续如果再做新类型，优先先复用现有按钮宿主位置和参数组织方式，再单独替换主视觉、边缘素材和点击峰值层；不要每做一个类型就从零重新搭播放页浮层结构

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

补充说明：

- 低强度高光本体不是历史弹幕层的一部分，而是主互动层中的轻量组件
- 用户点击低强度云朵后，文案会写入互动记录，再进入后续历史弹幕回流展示
- 当前低强度云朵支持：
  - 最多 `3` 条选项
  - 按长短自动拆成 `1-2` 行
  - 云朵宽度按字数动态适配
  - 两行允许轻微负间距，抵消素材透明留白
  - 整组相对底部控制区上移，避免压住播放器底栏

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
- 高光实验与调试宿主

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
- `HighlightOverlayState`
- `HighlightRenderSpec`
- `HighlightAssetProfile`
- `HighlightDebugModel`

其中高光相关模型建议进一步收口：

`HighlightUiModel`

- `id`
- `type`
- `intensity`
- `title`
- `description`
- `interactionOptions`
- `startTimeMs`
- `endTimeMs`
- `interactionAppearMs`
- `interactionStartMs`
- `interactionEndMs`
- `stats`

`HighlightOverlayState`

- `activeHighlight`
- `isInteractable`
- `clickCount`
- `burstLevel`
- `cooldownUntilMs`

`HighlightRenderSpec`

- `type`
- `intensity`
- `triggerLabel`
- `glyphSet`
- `motionProfile`
- `assetProfile`

`HighlightAssetProfile`

- `idleAsset`
- `burstAsset`
- `edgeAsset`
- `particleProfile`
- `hapticLevel`

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

高光部分建议再细分为：

- `timelineHighlights`：当前集高光原始列表
- `activeHighlight`：当前时间轴命中的高光
- `highlightOverlayState`：当前可见组件状态
- `interactionSessionState`：点击次数、最近点击、上报中状态
- `debugHighlightOverride`：设置页调试注入的本地高光

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

- `HighlightStage`
- `HighlightRenderer`
- `HighlightAssetHost`
- `HighlightWeakHint`
- `QuickSendPrompt`
- `TypeTriggerCard`
- `FeelGoodOverlay`
- `FunnyOverlay`
- `ReversalOverlay`
- `ConflictOverlay`
- `SweetOverlay`
- `EdgeAtmosphereLayer`

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

建议的 `ui/overlay/` 目录：

```text
ui/overlay/
  HighlightStage.kt
  HighlightRenderer.kt
  HighlightAssetHost.kt
  HighlightOverlayState.kt
  HighlightMotionSpec.kt
  HighlightWeakHint.kt
  QuickSendPrompt.kt
  TypeTriggerCard.kt
  FeelGoodOverlay.kt
  FunnyOverlay.kt
  ReversalOverlay.kt
  ConflictOverlay.kt
  SweetOverlay.kt
  EdgeAtmosphereLayer.kt
  HeatHintOverlay.kt
  HistoryDanmakuLane.kt
```

## 15.3 Compose 代码风格约定

- 页面函数只做结构编排，不堆复杂业务逻辑
- 业务状态流转放入 ViewModel
- 样式优先抽到 `ui/theme` 或基础组件
- 默认不滥用 `remember` / `derivedStateOf`
- 只有在重组成本明显时再做局部优化

高光动画的额外约束：

- 播放时间轴判定不直接放在具体 Composable 内
- 视觉 asset 的选择不和点击上报逻辑耦合
- 高强度组件优先使用稳定素材，不用纯 Compose 临时硬画出全部效果

## 15.4 设置页与调试面板接法

现有设置页已经具备“高光组件调试”入口，后续应正式收口成 `Highlight Motion Lab` 的真实播放态入口。

目标：

- 从设置页选择 `type + intensity`
- 进入真实 `PlayerScreen` 或 `DEBUG_PLAYER`
- 注入一条本地 debug highlight
- 在真实播放器层级里看默认态、点击态、退出态和遮挡情况

调试面板至少支持：

- 切换 5 类高光
- 切换强度 `1..5`
- 反复点击同一高光
- 切换背景视频
- 开关历史弹幕层
- 查看安全区遮挡辅助线

这一步非常关键，因为高光效果是否“惊艳”，本质上不是看静态截图，而是看它在真实视频、真实字幕、真实播控栏共存时是否还成立。

## 15.5 当前代码对齐前置项

在正式进入 5 类高光组件重构前，Android 端需要先完成一次口径清理：

- 删除 `SUSPENSE`
- 删除 `EMOTION_BURST`
- 清掉旧 `EmotionButtonGroup / VoteSidePanel / BoostActionButton / SuspensePromptCard` 心智
- 将 `sweet` 的默认文案从“嗑到了”收口到“心暖一下 / 被触动了”
- 将调试页里的“甜蜜 / 搞笑”改成“温情 / 笑点”
- 将互动上报类型从旧兼容值逐步收口为新规范，至少要保证类型语义和客户端展示一致

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

- 清理旧枚举与旧组件语义
- 补齐 `interactionAppearMs / interactionStartMs / interactionEndMs`
- 建 `HighlightStage`
- 建 `HighlightRenderer`
- 建 `HighlightAssetHost`
- 先打通 `HighlightWeakHint` 和 `QuickSendPrompt`
- 接通互动上报

## 20.4 阶段四：五类组件首版落地

- `feel_good` 首版
- `funny` 首版
- `reversal` 首版
- `conflict` 首版
- `sweet` 首版
- 完成中下触发按钮与点击峰值的统一骨架
- 让 5 类组件都能在真实播放页跑通

## 20.5 阶段五：历史互动回流

- 热度展示
- 历史弹幕展示
- 点击后刷新局部统计

## 20.6 阶段六：动效强化与资产替换

- 接入正式 Lottie / Rive / 序列帧资产
- 优化边缘氛围层
- 加入触感反馈
- 做安全区避让与性能压测
- 在 `Highlight Motion Lab` 中逐类调参

## 20.7 阶段七：尾集分支

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
