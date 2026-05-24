# Drama Pulse Android 播放性能优化实现方案

## 1. 文档目的

本文档用于指导 Android 端播放体验优化，聚焦以下 3 项：

- `ExoPlayer SimpleCache`
- `下一集预热`
- `播放页首进接口并行化`

本文档不是泛泛的优化建议，而是面向实现的开发方案，要求能够直接分发给其他 agent 开工。

本轮目标不是重构整个 Android 架构，而是在当前项目基础上，把“进入播放页慢、切集不够顺、回切不够丝滑”这 3 类问题系统收掉。

---

## 2. 优化目标

## 2.1 目标一：降低重复播放与回切时的黑屏和重新缓冲

问题表现：

- 从其他 tab 切回播放页时，虽然已经记住了时间点，但仍可能出现短暂黑屏或重新缓冲。
- 同一集再次进入时，存在重复网络读取和重复播放器准备。

优化目标：

- 同一视频重复进入时优先命中本地缓存。
- 减少媒体资源重复下载与重复读取。
- 提高“切出去再回来继续播”的稳定性和体感速度。

## 2.2 目标二：提高上下滑切集的切换速度

问题表现：

- 当前集滑到下一集时，仍可能出现明显的准备时间。
- 切到下一集前没有提前准备资源。

优化目标：

- 当前集播放时对下一集做轻量预热。
- 用户下滑/上滑切集时，尽量减少重新准备的等待时间。

## 2.3 目标三：减少首次进入播放页的等待

问题表现：

- 首次进入播放页时，`getEpisodes -> getEpisodeDetail -> getHighlights` 带来串行等待。
- 用户会感受到页面进入慢、视频出现晚。

优化目标：

- 将可并行的请求尽量并行化。
- 降低播放页首进的总等待时长。
- 优先让视频先准备起来，附属数据随后补齐。

---

## 3. 当前问题拆解

当前播放体验的瓶颈并不是单点，而是 3 层叠加：

1. `媒体层`
   - 同一视频多次进入时仍会重新读取资源
   - 切换剧集时没有预热

2. `接口层`
   - 首次进入播放页时，请求链路串行
   - 视频详情、高光、互动状态的准备彼此阻塞

3. `生命周期层`
   - 页面切换虽然已有一定保活，但还没有用媒体缓存进一步托底
   - 真机联调下，seek 到已记录位置后仍可能短暂 buffering

因此，本轮优化必须按：

`接口并行化 -> 预热 -> 媒体缓存`

这条逻辑来做，而不是只上一种手段。

---

## 4. 总体技术路线

## 4.1 总体原则

- 优先保持现有 `PlayerViewModel + ExoPlayerController + Repository` 架构不变。
- 优先在现有类上增强，不轻易引入新的复杂中间层。
- 优先做“对体验收益明显”的优化，不做过度工程化。

## 4.2 路线拆分

### 路线 A：接口并行化

目的：

- 缩短首次进入播放页时从点击到开始准备视频的时间。

策略：

- `getEpisodes(dramaId)` 仍作为第一步，因为目标集定位依赖它。
- 在拿到目标 `episodeId` 后，将以下动作并行化：
  - `getEpisodeDetail(episodeId)`
  - `getHighlights(episodeId)`
  - `loadSocialState(dramaId, episodeId)`
- `watchProgress` 的读取尽量提前，避免阻塞视频详情准备。

### 路线 B：下一集预热

目的：

- 提高上下滑切集时的顺滑度。

策略：

- 当前集进入 `READY` 或 `PLAYING` 后，获取下一集的 `videoUrl`。
- 使用 ExoPlayer 的下一媒体项能力，或最小化版本的预连接/预解析策略，对下一集进行预热。
- 第一版预热不追求复杂队列，只处理：
  - `下一集`
  - 可选支持 `上一集`

### 路线 C：SimpleCache

目的：

- 减少相同媒体反复进入时的下载和读取成本。

策略：

- 在 `ExoPlayerController` 中为 `DefaultDataSource.Factory` 加入 `CacheDataSource.Factory`。
- 使用应用级单例 `SimpleCache`。
- 缓存目录放在：
  - `context.cacheDir/media-cache`
- 缓存索引使用 `StandaloneDatabaseProvider`。

---

## 5. 改哪些类

## 5.1 必改类

### 1. `android-app/app/src/main/java/com/dramapulse/app/core/player/ExoPlayerController.kt`

职责调整：

- 接入 `SimpleCache`
- 统一构建带缓存的数据源工厂
- 支持下一集预热
- 保持当前“同 URL 不重建播放器”的优化

建议新增能力：

- `setPreloadCandidate(mediaUrl: String?)`
- `prepareNextMediaItem(mediaUrl: String?)`
- `buildCachedMediaSource(mediaUrl: String)`

### 2. `android-app/app/src/main/java/com/dramapulse/app/feature/player/PlayerViewModel.kt`

职责调整：

- 将播放页首进链路改为“先定位 episode，再并行准备附属数据”
- 在当前集准备好后触发下一集预热
- 在切集时更新预热目标

建议调整方法：

- `loadAndPlay(dramaId, episodeId)`
- `loadEpisodeDetail(...)`
- `selectEpisode(index)`

建议新增方法：

- `preloadAdjacentEpisode()`
- `resolveTargetEpisode(...)`

### 3. `android-app/app/src/main/java/com/dramapulse/app/app/AppContainer.kt`

职责调整：

- 提供应用级共享的媒体缓存依赖

建议新增：

- `mediaCacheProvider`

### 4. `android-app/app/src/main/java/com/dramapulse/app/app/AppNavHost.kt`

职责调整：

- 保持当前 `PlayerViewModel` 与 `playerController` 的 remember 保活逻辑
- 不在本轮增加复杂导航变更

### 5. `android-app/app/src/test/java/com/dramapulse/app/feature/player/PlayerViewModelTest.kt`

职责调整：

- 补并行化后的行为测试
- 补预热触发测试

## 5.2 建议新增类

### 1. `android-app/app/src/main/java/com/dramapulse/app/core/player/MediaCacheProvider.kt`

职责：

- 封装 `SimpleCache` 单例创建
- 封装缓存目录和淘汰策略

建议职责尽量单一：

- 不放播放逻辑
- 只负责缓存对象生命周期

### 2. `android-app/app/src/test/java/com/dramapulse/app/feature/player/PlayerPreloadTest.kt`

职责：

- 专门测试“下一集预热是否触发”

---

## 6. 详细技术方案

## 6.1 播放页首进接口并行化

### 当前串行问题

当前首进播放页的大致顺序是：

1. `getEpisodes(dramaId)`
2. 计算目标 episode
3. `getEpisodeDetail(episodeId)`
4. `getHighlights(episodeId)`
5. `loadSocialState(dramaId, episodeId)`
6. `playerController.attach(...)`

问题在于：

- `getHighlights` 和 `loadSocialState` 不应该阻塞视频准备
- 视频详情和附属数据完全串行，导致感知等待变长

### 优化后顺序

建议改成：

1. `getEpisodes(dramaId)`
2. 结合 `watchProgress` 计算目标 episode
3. 并行启动：
   - `getEpisodeDetail(episodeId)`
   - `getHighlights(episodeId)`
   - `loadSocialState(dramaId, episodeId)`
4. `getEpisodeDetail` 一完成，立即：
   - 更新 `currentEpisode`
   - `playerController.attach(videoUrl, startPositionMs)`
5. `highlights` 和 `social state` 完成后再补到页面

### 实现建议

在 `PlayerViewModel` 中使用：

- `coroutineScope { ... }`
- `async { ... }`
- `await()`

注意：

- 不要为了并行化引入多个嵌套 `launch`
- 要保持失败可控
- 视频详情失败时应直接进入错误态
- 高光或社交状态失败时可降级，不应阻塞视频本体

### 降级规则

- `getEpisodeDetail` 失败：播放页错误态
- `getHighlights` 失败：高光层为空
- `loadSocialState` 失败：收藏/评论/弹幕用默认空状态

---

## 6.2 下一集预热

### 目标

在当前集播放时，提前让播放器知道下一集资源，降低切集时的等待。

### 第一版建议实现

第一版不做复杂预加载队列，只做：

- 当前集准备完成后，检查是否有下一集
- 若有下一集，则调用 `playerController.prepareNextMediaItem(nextEpisode.videoUrl)`

### 实现方式建议

优先采用 ExoPlayer 原生能力中的“下一媒体项准备”思路，而不是自己硬做第二个播放器实例。

建议策略：

- 当前主播放器仍只负责当前播放
- 控制器内部记录一个 `preloadedMediaUrl`
- 当用户切到下一集时，如果目标 URL 与 `preloadedMediaUrl` 一致，则走更轻量的切换路径

### 第一版边界

第一版只保证：

- `下一集` 预热

暂不要求：

- 完整上一集预热
- 多集预取
- 智能淘汰策略

### 风险提醒

如果直接用同一个播放器提前切入下一媒体项，容易影响当前正在播放的媒体状态。

因此建议：

- 第一版先做“下一集数据源预热 / media source 预建”
- 不要过早把完整播放队列逻辑塞进当前架构

---

## 6.3 ExoPlayer SimpleCache

### 目标

让同一视频二次进入时能尽量命中本地缓存，减少重新下载和重新读取带来的黑屏/等待。

### 建议实现

新增应用级缓存提供者：

- `MediaCacheProvider`

内部持有：

- `SimpleCache`
- `LeastRecentlyUsedCacheEvictor`
- `StandaloneDatabaseProvider`

缓存目录：

- `context.cacheDir/media-cache`

缓存大小建议：

- 第一版建议 `300MB - 800MB`
- 比赛 demo 阶段优先推荐 `512MB`

### 在播放器中接入

在 `ExoPlayerController` 中，将原本的数据源改成：

- `DefaultHttpDataSource.Factory`
- `DefaultDataSource.Factory`
- `CacheDataSource.Factory`

然后由此构建 `MediaSource`。

### 第一版边界

第一版只做：

- 本地缓存读写
- 相同 URL 命中缓存

暂不做：

- 下载进度可视化
- 缓存管理页面
- 用户级清理缓存入口

---

## 7. 风险点

## 7.1 媒体缓存风险

- `SimpleCache` 生命周期管理不当会导致资源占用异常
- 多次创建缓存实例可能引发锁冲突

控制策略：

- 只能有一个应用级 `SimpleCache`
- 必须通过 `MediaCacheProvider` 统一获取

## 7.2 预热风险

- 预热实现不当可能反而影响当前播放
- 若过早引入复杂播放队列，可能把现有稳定路径打乱

控制策略：

- 第一版只做轻量预热
- 不改当前主播放链路的核心状态机

## 7.3 并行化风险

- 并行化后更容易出现状态覆盖和竞态
- 快速切剧、快速切集时，旧请求可能回写新状态

控制策略：

- 每次切集前记录当前目标 `episodeId`
- 回写 UI 状态时校验是否仍是当前目标
- 必要时取消上一轮未完成的任务

## 7.4 误判风险

- 用户体感卡顿不一定全部来自网络层
- 真机上仍可能受系统解码、磁盘 IO、局域网速度影响

控制策略：

- 优化后分开验证：
  - 首进速度
  - 同集回切速度
  - 下一集切换速度

---

## 8. 实现顺序

建议严格按以下顺序做：

### 第一步：播放页首进接口并行化

原因：

- 这是当前收益最高、风险最小的一项
- 能最快改善“首次进入播放页很慢”的问题

完成标准：

- `PlayerViewModel` 首进逻辑完成并行化
- 视频详情准备不再被高光和社交状态阻塞
- 原有功能不回退

### 第二步：下一集预热

原因：

- 直接改善上下滑切集体验
- 比起直接上缓存，更容易观察切集体感变化

完成标准：

- 当前集播放中会设置下一集预热目标
- 切到下一集时能看到体感改善

### 第三步：接入 SimpleCache

原因：

- 这是最偏基础设施的一层
- 放在前两项之后更容易验证收益

完成标准：

- 同一视频重复进入能命中缓存
- 不影响当前播放稳定性

### 第四步：联调与回归

验证以下 3 条体验：

1. 首页进入播放页速度
2. 从其他 tab 回到同一集继续播
3. 上下滑切到下一集/上一集的速度

---

## 9. 验收标准

本轮优化完成后，至少满足：

- 同一集从其他 tab 回到播放页时，不应再完整重建播放器
- 首次进入播放页时，视频准备先于高光/社交附属数据完成
- 切到下一集时，明显优于当前无预热版本
- 收藏、评论、弹幕的本地状态在应用重启后仍可恢复
- 所有改动通过：
  - `assembleDebug`
  - `testDebugUnitTest`

---

## 10. 交付给 Agent 的执行要求

可直接附给 agent：

```text
你现在负责 Drama Pulse Android 播放性能优化，只实现以下 3 项：
1. 播放页首进接口并行化
2. 下一集预热
3. ExoPlayer SimpleCache

请严格按 /Users/a0000/Desktop/项目文件/drama-pulse/docs/Android播放性能优化实现方案.md 执行。

要求：
- 不重构整个 Android 架构
- 优先在现有 PlayerViewModel / ExoPlayerController / AppContainer 上增强
- 先写测试，再写实现
- 不允许跳过 assembleDebug 和 testDebugUnitTest 验证
- 每完成一项要明确说明：
  - 改了哪些类
  - 当前收益是什么
  - 还剩什么风险
```

