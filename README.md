# Drama Pulse

Drama Pulse 是一个面向短剧场景的互动播放器项目。

项目核心目标是把“看剧”从单向播放，扩展成两条完整的用户参与链路：

- 剧情高光时刻的即时互动
- 尾集结束后的固定分支与自定义分支

当前仓库已经不再处于“工程骨架”阶段，而是进入了可交付、可演示、可答辩的 MVP 收口阶段。现有版本已经打通：

- Android 客户端播放主链路
- 低强度快捷弹幕与高强度正式高光组件
- 历史热度与互动回流
- 2 个固定分支 + 1 个自定义分支任务
- 本地 Node.js 服务端
- 本地 Web 管理后台
- AI 辅助的高光识别与尾集分支图文分镜生成链路

## 当前交付状态

当前版本的最终交付口径以以下能力为准：

- `高光互动`：客户端只消费 `confirmed` 高光标签，按时间轴触发低强度或高强度互动组件
- `历史回流`：互动事件会聚合成热度和群体反馈，在后续播放中回流展示
- `尾集分支`：固定分支与自定义分支结果已经统一到 `image_story + storyboardCards` 的图文消费结构
- `本地部署`：服务端默认监听 `0.0.0.0:8787`，支持本机与局域网联调
- `交付素材`：截图与录屏素材统一放在 `docs/submission-assets/`
- `APK 归档`：当前可安装 debug APK 已归档到 `docs/submission-assets/apk/`

## 仓库结构

```text
android-app/                 Android 客户端（Gradle / Kotlin / Compose）
server/                      本地服务端（Fastify / Prisma / SQLite）
admin-web/                   本地 Web 管理后台（React / Vite）
assets/                      封面、固定分支结果、参考资产、测试生成图
assets/generated/fixed-branches/
                             固定分支图文结果 sidecar 与 manifest
assets/generated/manual-storyboard-tests/
                             手工校准过的分镜测试图
videos/                      本地原始短剧视频资源
docs/                        产品、技术、交付、启动与专项实施文档
docs/submission-assets/      交付截图与录屏素材
docs/submission-assets/apk/  归档 APK
data/                        导出与 seed 辅助数据
server/data/                 服务端运行库与测试库
tmp/                         本地预览与同步临时文件
```

补充说明：

- 默认运行数据库是 `server/data/app.db`
- 测试数据库是 `server/data/test.app.db`
- 固定分支的客户端消费结果以 `assets/generated/fixed-branches/<episode_id>/` 下的 sidecar 和 manifest 为准
- 根目录 `data/` 主要放导出结果和辅助数据，不是服务端主运行库

## 快速启动

### 1. 服务端

```bash
cd /Users/a0000/Desktop/项目文件/drama-pulse/server
pnpm install
pnpm dev
```

默认监听：

- `http://localhost:8787`
- `http://<局域网IP>:8787`

### 2. Web 管理后台

```bash
cd /Users/a0000/Desktop/项目文件/drama-pulse/admin-web
pnpm install
pnpm dev
```

默认前端开发地址：

- `http://localhost:5173`

### 3. Android 客户端

推荐直接用 Android Studio 打开 `android-app/`。

如果使用命令行，可在项目目录下执行：

```bash
cd /Users/a0000/Desktop/项目文件/drama-pulse/android-app
./gradlew assembleDebug
```

如需真机联调，需要把客户端请求地址改成服务端所在电脑的局域网 IP。

## 文档导航

优先阅读：

- [文档索引](/Users/a0000/Desktop/项目文件/drama-pulse/docs/README.md)
- [项目交付文档-飞书提交版](/Users/a0000/Desktop/项目文件/drama-pulse/docs/项目交付文档-飞书提交版.md)
- [本地启动与后台登录说明](/Users/a0000/Desktop/项目文件/drama-pulse/docs/本地启动与后台登录说明.md)
- [项目结构说明](/Users/a0000/Desktop/项目文件/drama-pulse/docs/项目结构说明.md)
- [交付素材说明](/Users/a0000/Desktop/项目文件/drama-pulse/docs/submission-assets/README.md)

核心技术文档：

- [Android端技术实现方案](/Users/a0000/Desktop/项目文件/drama-pulse/docs/Android端技术实现方案.md)
- [本地服务端技术实现方案](/Users/a0000/Desktop/项目文件/drama-pulse/docs/本地服务端技术实现方案.md)
- [Web管理后台技术实现方案](/Users/a0000/Desktop/项目文件/drama-pulse/docs/Web管理后台技术实现方案.md)
- [高光识别与打标实现方案](/Users/a0000/Desktop/项目文件/drama-pulse/docs/高光识别与打标实现方案.md)
- [尾集分支生成任务技术实施方案](/Users/a0000/Desktop/项目文件/drama-pulse/docs/尾集分支生成任务技术实施方案.md)

## 当前收尾重点

当前更适合继续补充的是：

- APK 导出与安装说明
- 最终录屏素材
- 交付截图继续筛选与压缩
- 若需要长期维护，再进一步整理历史“初稿”文档和正式文档之间的归档关系
